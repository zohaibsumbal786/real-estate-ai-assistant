import { createHmac } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@dubai-ai/db";
import { config } from "./config.js";
import { createApp } from "./app.js";

const app = createApp();

function signPayload(payload: string) {
  return `sha256=${createHmac("sha256", config.META_APP_SECRET)
    .update(Buffer.from(payload))
    .digest("hex")}`;
}

function whatsappPayload(overrides: { text?: string; messageId?: string; from?: string } = {}) {
  return {
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
                  wa_id: overrides.from ?? "971501234567",
                  profile: { name: "Test Customer" }
                }
              ],
              messages: [
                {
                  from: overrides.from ?? "971501234567",
                  id: overrides.messageId ?? `wamid.${Date.now()}`,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: "text",
                  text: {
                    body: overrides.text ?? "Can you help me with your pricing?"
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  };
}

describe("WhatsApp webhook and AI routing", () => {
  beforeAll(async () => {
    await prisma.organization.update({
      where: { slug: "demo-sme-llc" },
      data: {
        whatsappPhoneNumberId: "demo-phone-number-id",
        whatsappBusinessAccountId: "demo-waba-id"
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("verifies Meta webhook subscription challenge", async () => {
    await request(app)
      .get("/api/whatsapp/webhook")
      .query({
        "hub.mode": "subscribe",
        "hub.verify_token": config.META_VERIFY_TOKEN,
        "hub.challenge": "challenge-123"
      })
      .expect(200, "challenge-123");
  });

  it("rejects invalid webhook signatures", async () => {
    await request(app)
      .post("/api/whatsapp/webhook")
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", "sha256=bad")
      .send(JSON.stringify(whatsappPayload()))
      .expect(401);
  });

  it("parses a signed WhatsApp message and prints a mocked outgoing response", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const payload = JSON.stringify(
      whatsappPayload({
        text: "Can you help me with your pricing?",
        messageId: `wamid.pricing.${Date.now()}`
      })
    );

    const response = await request(app)
      .post("/api/whatsapp/webhook")
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", signPayload(payload))
      .send(payload)
      .expect(200);

    expect(response.body.results[0].status).toBe("responded");
    expect(response.body.results[0].intent.intent).toBe("sales");
    expect(response.body.results[0].language).toBe("english");
    expect(logSpy).toHaveBeenCalledWith(
      "[Meta Cloud API mock] outgoing WhatsApp message",
      expect.objectContaining({
        phoneNumberId: "demo-phone-number-id",
        to: "971501234567"
      })
    );

    logSpy.mockRestore();
  });

  it("flags conversations for human takeover when requested", async () => {
    const payload = JSON.stringify(
      whatsappPayload({
        text: "I want to speak to a human agent please",
        messageId: `wamid.human.${Date.now()}`,
        from: "971509999999"
      })
    );

    const response = await request(app)
      .post("/api/whatsapp/webhook")
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", signPayload(payload))
      .send(payload)
      .expect(200);

    expect(response.body.results[0].status).toBe("escalated");

    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id: response.body.results[0].conversationId }
    });

    expect(conversation.needsHuman).toBe(true);
    expect(conversation.aiPausedAt).toBeTruthy();
  });
});
