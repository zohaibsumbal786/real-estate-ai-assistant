import { Router } from "express";
import { ConversationStatus, MessageDirection, MessageType, prisma } from "@dubai-ai/db";
import { z } from "zod";
import { authenticate, enforceTenant } from "../middleware/auth.js";
import { HttpError } from "../lib/http-error.js";
import { sendWhatsAppText } from "../services/meta-cloud-api.js";
import { assertMessageLimit } from "../services/plan-limits.js";

export const conversationsRouter = Router();

const aiToggleSchema = z.object({
  aiEnabled: z.boolean()
});

const sendMessageSchema = z.object({
  body: z
    .string()
    .min(1, "Message cannot be empty")
    .max(4096, "Message is too long (max 4096 characters)")
    .refine(
      (val) => {
        // WhatsApp only supports certain characters, warn if using unusual ones
        return /^[\p{L}\p{N}\p{P}\p{Z}\p{S}]*$/u.test(val) || val.length < 100;
      },
      "Message contains unsupported characters"
    )
});

conversationsRouter.use(authenticate, enforceTenant);

conversationsRouter.get("/", async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { organizationId: req.tenantId! },
      orderBy: [{ needsHuman: "desc" }, { updatedAt: "desc" }],
      take: 50,
      include: {
        customer: true,
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        messages: { orderBy: { sentAt: "desc" }, take: 1 }
      }
    });
    res.json({ data: conversations });
  } catch (error) {
    next(error);
  }
});

conversationsRouter.get("/:id", async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.findFirstOrThrow({
      where: { id: req.params.id, organizationId: req.tenantId! },
      include: {
        customer: true,
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        messages: { orderBy: { sentAt: "asc" } }
      }
    });
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

conversationsRouter.patch("/:id/ai", async (req, res, next) => {
  try {
    const payload = aiToggleSchema.parse(req.body);
    const conversation = await prisma.conversation.update({
      where: { id: req.params.id, organizationId: req.tenantId! },
      data: {
        needsHuman: !payload.aiEnabled,
        aiPausedAt: payload.aiEnabled ? null : new Date(),
        status: payload.aiEnabled ? ConversationStatus.OPEN : ConversationStatus.PENDING
      }
    });
    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

conversationsRouter.post("/:id/messages", async (req, res, next) => {
  try {
    const payload = sendMessageSchema.parse(req.body);
    await assertMessageLimit(req.tenantId!);
    const conversation = await prisma.conversation.findFirstOrThrow({
      where: { id: req.params.id, organizationId: req.tenantId! },
      include: { customer: true, organization: true }
    });

    // Validate customer phone is available
    if (!conversation.customer.phone) {
      throw new HttpError(400, "Customer phone number is not set", "MISSING_PHONE");
    }

    // Validate organization has WhatsApp configured
    if (!conversation.organization.whatsappPhoneNumberId) {
      throw new HttpError(
        400,
        "Organization WhatsApp phone number not configured",
        "WHATSAPP_NOT_CONFIGURED"
      );
    }

    const outgoing = await sendWhatsAppText({
      phoneNumberId: conversation.organization.whatsappPhoneNumberId,
      to: conversation.customer.phone,
      body: payload.body
    });

    if (!outgoing.success) {
      throw new HttpError(
        500,
        `Failed to send WhatsApp message: ${outgoing.error || "Unknown error"}`,
        "WHATSAPP_SEND_FAILED"
      );
    }

    const message = await prisma.message.create({
      data: {
        organizationId: req.tenantId!,
        conversationId: conversation.id,
        customerId: conversation.customerId,
        senderUserId: req.auth!.userId,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEXT,
        body: payload.body,
        providerMessageId: outgoing.providerMessageId,
        metadata: { manual: true, mocked: outgoing.mocked }
      }
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), needsHuman: true, aiPausedAt: new Date() }
    });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});
