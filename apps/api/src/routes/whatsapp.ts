import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { HttpError } from "../lib/http-error.js";
import { verifyMetaSignature } from "../lib/meta-signature.js";
import { processWhatsAppWebhook } from "../services/whatsapp-webhook-service.js";

export const whatsappRouter = Router();

const whatsappPayloadSchema = z.object({
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              value: z.object({
                metadata: z
                  .object({
                    phone_number_id: z.string().optional()
                  })
                  .optional(),
                contacts: z
                  .array(
                    z.object({
                      wa_id: z.string().optional(),
                      profile: z.object({ name: z.string().optional() }).optional()
                    })
                  )
                  .optional(),
                messages: z
                  .array(
                    z.object({
                      id: z.string().optional(),
                      from: z.string().optional(),
                      timestamp: z.string().optional(),
                      type: z.string().optional(),
                      text: z.object({ body: z.string().optional() }).optional()
                    })
                  )
                  .optional()
              })
            })
          )
          .optional()
      })
    )
    .optional()
});

whatsappRouter.get("/webhook", (req, res, next) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.META_VERIFY_TOKEN && typeof challenge === "string") {
    return res.status(200).send(challenge);
  }

  return next(new HttpError(403, "Invalid WhatsApp webhook verification token", "META_VERIFY_FAILED"));
});

whatsappRouter.post("/webhook", async (req, res, next) => {
  try {
    const isValid = verifyMetaSignature({
      appSecret: config.META_APP_SECRET,
      rawBody: req.rawBody,
      signatureHeader: req.header("x-hub-signature-256")
    });

    if (!isValid) {
      throw new HttpError(401, "Invalid Meta webhook signature", "META_SIGNATURE_INVALID");
    }

    const payload = whatsappPayloadSchema.parse(req.body);
    const results = await processWhatsAppWebhook(payload);
    res.json({ received: true, results });
  } catch (error) {
    next(error);
  }
});
