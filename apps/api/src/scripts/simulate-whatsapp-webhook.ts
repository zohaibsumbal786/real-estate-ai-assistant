import { createHmac } from "node:crypto";
import request from "supertest";
import { prisma } from "@dubai-ai/db";
import { config } from "../config.js";
import { createApp } from "../app.js";

const payload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "demo-waba-id",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "971501112233",
              phone_number_id: "demo-phone-number-id"
            },
            contacts: [
              {
                wa_id: "971501234567",
                profile: { name: "Simulated Customer" }
              }
            ],
            messages: [
              {
                from: "971501234567",
                id: `wamid.simulated.${Date.now()}`,
                timestamp: Math.floor(Date.now() / 1000).toString(),
                type: "text",
                text: {
                  body: "Hi, can you help me with your pricing packages?"
                }
              }
            ]
          }
        }
      ]
    }
  ]
};

async function main() {
  await prisma.organization.update({
    where: { slug: "demo-sme-llc" },
    data: {
      whatsappPhoneNumberId: "demo-phone-number-id",
      whatsappBusinessAccountId: "demo-waba-id"
    }
  });

  const rawPayload = JSON.stringify(payload);
  const signature = `sha256=${createHmac("sha256", config.META_APP_SECRET)
    .update(Buffer.from(rawPayload))
    .digest("hex")}`;

  const response = await request(createApp())
    .post("/api/whatsapp/webhook")
    .set("Content-Type", "application/json")
    .set("X-Hub-Signature-256", signature)
    .send(rawPayload);

  console.log("[WhatsApp simulation] webhook response", response.status, response.body);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
