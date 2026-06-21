import {
  ConversationStatus,
  MessageDirection,
  MessageType,
  prisma
} from "@dubai-ai/db";
import { buildConversationContext, classifyIntent, detectLanguage, generateAssistantReply } from "./ai-engine.js";
import { maybeCreateAppointmentFromConfirmation, proposeBookingSlots } from "./booking-service.js";
import { searchKnowledge } from "./knowledge-service.js";
import { upsertLeadFromConversation } from "./lead-service.js";
import { sendWhatsAppText } from "./meta-cloud-api.js";
import { assertMessageLimit } from "./plan-limits.js";

type WhatsAppPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: {
          phone_number_id?: string;
        };
        contacts?: Array<{
          wa_id?: string;
          profile?: { name?: string };
        }>;
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
};

export async function processWhatsAppWebhook(payload: WhatsAppPayload) {
  const results = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;

      if (!value?.messages?.length || !phoneNumberId) {
        continue;
      }

      const organization = await prisma.organization.findUnique({
        where: { whatsappPhoneNumberId: phoneNumberId }
      });

      if (!organization) {
        console.warn("[WhatsApp webhook] unknown phone number id", { phoneNumberId });
        results.push({ status: "ignored", reason: "unknown_phone_number_id", phoneNumberId });
        continue;
      }

      for (const message of value.messages) {
        const result = await processIncomingMessage({
          organization,
          message,
          contacts: value.contacts ?? [],
          phoneNumberId
        });
        results.push(result);
      }
    }
  }

  return results;
}

async function processIncomingMessage(input: {
  organization: { id: string; name: string };
  phoneNumberId: string;
  contacts: Array<{ wa_id?: string; profile?: { name?: string } }>;
  message: {
    id?: string;
    from?: string;
    timestamp?: string;
    type?: string;
    text?: { body?: string };
  };
}) {
  const from = input.message.from;
  const body = input.message.text?.body?.trim();

  if (!from || !body || input.message.type !== "text") {
    return { status: "ignored", reason: "unsupported_message_type", providerMessageId: input.message.id };
  }

  await assertMessageLimit(input.organization.id);

  const contact = input.contacts.find((item) => item.wa_id === from);
  const sentAt = input.message.timestamp
    ? new Date(Number(input.message.timestamp) * 1000)
    : new Date();
  const providerMessageId = input.message.id ?? `local-${Date.now()}`;

  const customer = await prisma.customer.upsert({
    where: {
      organizationId_phone: {
        organizationId: input.organization.id,
        phone: from
      }
    },
    update: {
      whatsappId: from,
      name: contact?.profile?.name,
      lastSeenAt: new Date()
    },
    create: {
      organizationId: input.organization.id,
      whatsappId: from,
      phone: from,
      name: contact?.profile?.name,
      lastSeenAt: new Date()
    }
  });

  let conversation =
    (await prisma.conversation.findFirst({
      where: {
        organizationId: input.organization.id,
        customerId: customer.id,
        channel: "WHATSAPP",
        status: { in: [ConversationStatus.OPEN, ConversationStatus.PENDING] }
      },
      orderBy: { updatedAt: "desc" }
    })) ??
    (await prisma.conversation.create({
      data: {
        organizationId: input.organization.id,
        customerId: customer.id,
        channel: "WHATSAPP",
        status: ConversationStatus.OPEN,
        lastMessageAt: sentAt
      }
    }));

  const incomingMessage = await prisma.message.upsert({
    where: {
      organizationId_providerMessageId: {
        organizationId: input.organization.id,
        providerMessageId
      }
    },
    update: {},
    create: {
      organizationId: input.organization.id,
      conversationId: conversation.id,
      customerId: customer.id,
      providerMessageId,
      direction: MessageDirection.INBOUND,
      type: MessageType.TEXT,
      body,
      sentAt
    }
  });

  const language = detectLanguage(body);
  const intent = await classifyIntent(body);
  const lead = await upsertLeadFromConversation({
    organizationId: input.organization.id,
    customer,
    conversationId: conversation.id,
    messageText: body,
    intent: intent.intent
  });
  const shouldEscalate = intent.needsHuman || intent.intent === "other" || intent.confidence < 0.65;

  conversation = await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: sentAt,
      language,
      aiLastIntent: intent.intent,
      aiConfidence: intent.confidence,
      needsHuman: shouldEscalate,
      aiPausedAt: shouldEscalate ? new Date() : null,
      status: shouldEscalate ? ConversationStatus.PENDING : ConversationStatus.OPEN
    }
  });

  if (shouldEscalate) {
    console.log("[AI routing] conversation escalated to human", {
      conversationId: conversation.id,
      intent,
      language
    });
    return {
      status: "escalated",
      conversationId: conversation.id,
      incomingMessageId: incomingMessage.id,
      intent,
      language
    };
  }

  const appointment = await maybeCreateAppointmentFromConfirmation({
    organizationId: input.organization.id,
    conversationId: conversation.id,
    customer,
    messageText: body
  });
  const bookingSlots =
    !appointment && intent.intent === "booking"
      ? await proposeBookingSlots({
          organizationId: input.organization.id,
          conversationId: conversation.id
        })
      : [];
  const knowledgeResults = await searchKnowledge({
    organizationId: input.organization.id,
    query: body,
    limit: 4
  });
  const knowledgeContext = knowledgeResults
    .map((result, index) => `[${index + 1}] ${result.title}: ${result.content}`)
    .join("\n\n");
  const context = await buildConversationContext(conversation.id);
  const reply = await generateAssistantReply({
    organizationName: input.organization.name,
    userText: body,
    language,
    intent: intent.intent,
    context,
    knowledgeContext,
    bookingSlots,
    appointmentConfirmation: appointment
      ? `${appointment.startsAt.toISOString()} - ${appointment.endsAt.toISOString()}`
      : undefined
  });

  await assertMessageLimit(input.organization.id);

  const outgoing = await sendWhatsAppText({
    phoneNumberId: input.phoneNumberId,
    to: from,
    body: reply
  });

  const outgoingMessage = await prisma.message.create({
    data: {
      organizationId: input.organization.id,
      conversationId: conversation.id,
      customerId: customer.id,
      providerMessageId: outgoing.providerMessageId,
      direction: MessageDirection.OUTBOUND,
      type: MessageType.TEXT,
      body: reply,
      metadata: {
        mocked: outgoing.mocked,
        intent: intent.intent,
        confidence: intent.confidence,
        language,
        leadId: lead?.id,
        appointmentId: appointment?.id,
        bookingSlots,
        ragChunkIds: knowledgeResults.map((result) => result.id)
      }
    }
  });

  return {
    status: "responded",
    conversationId: conversation.id,
    incomingMessageId: incomingMessage.id,
    outgoingMessageId: outgoingMessage.id,
    reply,
    intent,
    language,
    leadId: lead?.id,
    appointmentId: appointment?.id,
    ragChunks: knowledgeResults.length
  };
}
