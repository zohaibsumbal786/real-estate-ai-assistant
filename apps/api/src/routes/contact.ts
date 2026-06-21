import { Router } from "express";
import { z } from "zod";
import { NotificationType, prisma } from "@dubai-ai/db";
import { sendContactInquiryEmail } from "../services/email-service.js";

export const contactRouter = Router();

const contactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  company: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
  message: z.string().min(10).max(5000),
  locale: z.string().max(5).optional()
});

contactRouter.post("/", async (req, res, next) => {
  try {
    const payload = contactSchema.parse(req.body);

    await sendContactInquiryEmail(payload);

    const demoOrg = await prisma.organization.findFirst({
      where: { slug: "demo-sme-llc" },
      select: { id: true }
    });

    if (demoOrg) {
      await prisma.notification.create({
        data: {
          organizationId: demoOrg.id,
          type: NotificationType.SYSTEM,
          title: "New contact inquiry",
          body: `${payload.name} (${payload.email}) submitted a contact form.`,
          metadata: payload
        }
      });
    }

    res.status(201).json({ success: true, message: "Thank you. Our team will respond within 24 hours." });
  } catch (error) {
    next(error);
  }
});
