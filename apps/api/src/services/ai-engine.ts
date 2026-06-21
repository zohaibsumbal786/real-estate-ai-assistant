import OpenAI from "openai";
import { MessageDirection, prisma } from "@dubai-ai/db";
import { config } from "../config.js";

export type Intent = "support" | "sales" | "booking" | "complaint" | "other";
export type Language = "arabic" | "english";

export type IntentResult = {
  intent: Intent;
  confidence: number;
  needsHuman: boolean;
  reason: string;
};

const humanRequestPattern =
  /\b(human|agent|person|representative|staff|manager|call me|talk to someone)\b/i;

export function detectLanguage(text: string): Language {
  return /[\u0600-\u06FF]/.test(text) ? "arabic" : "english";
}

export async function classifyIntent(text: string): Promise<IntentResult> {
  if (config.OPENAI_MOCK_RESPONSES || !config.OPENAI_API_KEY) {
    return mockClassifyIntent(text);
  }

  const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: config.OPENAI_MODEL,
    messages: [{
      role: "system",
      content: "Classify this WhatsApp message for an SME assistant. Return only valid JSON with intent, confidence, needsHuman, and reason fields. Intent must be one of: support, sales, booking, complaint, other. Confidence between 0-1. Always return valid JSON."
    }, {
      role: "user",
      content: text
    }],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 200
  });

  const jsonText = response.choices[0].message.content || "{}";
  return JSON.parse(jsonText) as IntentResult;
}

export async function buildConversationContext(conversationId: string, limit = 12) {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { sentAt: "desc" },
    take: limit
  });

  return messages.reverse().map((message) => ({
    role: message.direction === MessageDirection.INBOUND ? "customer" : "assistant",
    content: message.body ?? ""
  }));
}

export async function generateAssistantReply(input: {
  organizationName: string;
  userText: string;
  language: Language;
  intent: Intent;
  context: Array<{ role: string; content: string }>;
  knowledgeContext?: string;
  bookingSlots?: Array<{ label: string }>;
  appointmentConfirmation?: string;
}) {
  if (config.OPENAI_MOCK_RESPONSES || !config.OPENAI_API_KEY) {
    return mockGenerateReply(input);
  }

  const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  const languageInstruction =
    input.language === "arabic"
      ? "Reply in Arabic. Keep the tone warm, professional, and concise."
      : "Reply in English. Keep the tone warm, professional, and concise.";

  const systemPrompt = [
    `You are Dubai AI Business Agent for ${input.organizationName}.`,
    `Detected intent: ${input.intent}.`,
    languageInstruction,
    input.knowledgeContext
      ? `Business knowledge context:\n${input.knowledgeContext}`
      : "No business knowledge context was found.",
    input.bookingSlots?.length
      ? `Offer these appointment slots:\n${input.bookingSlots.map((slot, index) => `${index + 1}. ${slot.label}`).join("\n")}`
      : "",
    input.appointmentConfirmation
      ? `The appointment has been saved: ${input.appointmentConfirmation}`
      : "",
    "Use the conversation context. Do not invent unavailable business policies. Ask one useful follow-up when needed."
  ].join("\n");

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...input.context.map((item) => ({
      role: (item.role === "customer" ? "user" : "assistant") as "user" | "assistant",
      content: item.content
    })),
    { role: "user", content: input.userText }
  ];

  const response = await client.chat.completions.create({
    model: config.OPENAI_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 300
  });

  return response.choices[0].message.content?.trim() || "";
}

function mockClassifyIntent(text: string): IntentResult {
  const lower = text.toLowerCase();
  const needsHuman = humanRequestPattern.test(text);

  if (needsHuman) {
    return {
      intent: "other",
      confidence: 0.99,
      needsHuman: true,
      reason: "Customer explicitly asked for a human."
    };
  }

  if (/\b(price|pricing|quote|buy|package|plan|cost)\b/i.test(lower)) {
    return { intent: "sales", confidence: 0.88, needsHuman: false, reason: "Sales terms detected." };
  }

  if (/\b(book|booking|appointment|meeting|schedule|visit)\b/i.test(lower)) {
    return { intent: "booking", confidence: 0.9, needsHuman: false, reason: "Booking terms detected." };
  }

  if (/\b(confirm|book it|yes|that works|slot\s*\d+|option\s*\d+)\b/i.test(lower)) {
    return { intent: "booking", confidence: 0.87, needsHuman: false, reason: "Booking confirmation detected." };
  }

  if (/\b(angry|bad|complaint|refund|problem|terrible|not happy)\b/i.test(lower)) {
    return { intent: "complaint", confidence: 0.86, needsHuman: false, reason: "Complaint terms detected." };
  }

  if (/\b(help|support|issue|question|how|setup)\b/i.test(lower)) {
    return { intent: "support", confidence: 0.82, needsHuman: false, reason: "Support terms detected." };
  }

  return { intent: "other", confidence: 0.45, needsHuman: true, reason: "Intent confidence is low." };
}

function mockGenerateReply(input: {
  organizationName: string;
  language: Language;
  intent: Intent;
  knowledgeContext?: string;
  bookingSlots?: Array<{ label: string }>;
  appointmentConfirmation?: string;
}) {
  if (input.appointmentConfirmation) {
    return input.language === "arabic"
      ? `تم تأكيد الموعد: ${input.appointmentConfirmation}.`
      : `Your appointment is confirmed: ${input.appointmentConfirmation}.`;
  }

  if (input.language === "arabic") {
    if (input.bookingSlots?.length) {
      return `يمكنني حجز موعد لك. الخيارات المتاحة: ${input.bookingSlots
        .map((slot, index) => `${index + 1}) ${slot.label}`)
        .join("، ")}.`;
    }
    return `شكراً لتواصلك مع ${input.organizationName}. استلمت طلبك وسأساعدك الآن.`;
  }

  if (input.bookingSlots?.length) {
    return `I can help you book an appointment. Available slots: ${input.bookingSlots
      .map((slot, index) => `${index + 1}) ${slot.label}`)
      .join(", ")}. Reply with the slot number to confirm.`;
  }

  const intentText =
    input.intent === "booking"
      ? "I can help you book an appointment."
      : input.intent === "sales"
        ? "I can help with pricing and package details."
        : input.intent === "complaint"
          ? "I’m sorry about that. I’ll help capture the details clearly."
          : "I can help with that.";

  const contextHint = input.knowledgeContext ? " I found relevant business information to guide this." : "";
  return `Thanks for contacting ${input.organizationName}. ${intentText}${contextHint}`;
}
