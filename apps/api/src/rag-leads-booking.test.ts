import { createHmac } from "node:crypto";
import JSZip from "jszip";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@dubai-ai/db";
import { config } from "./config.js";
import { createApp } from "./app.js";
import { processQueuedKnowledgeDocument } from "./services/knowledge-service.js";

const app = createApp();

let accessToken = "";
let organizationId = "";
let phoneNumberId = "";
let customerPhone = "";

function signPayload(payload: string) {
  return `sha256=${createHmac("sha256", config.META_APP_SECRET)
    .update(Buffer.from(payload))
    .digest("hex")}`;
}

async function createDocxBuffer(text: string) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>`
  );
  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`
  );
  zip.folder("word")?.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>
      </w:body>
    </w:document>`
  );

  return zip.generateAsync({ type: "nodebuffer" });
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function whatsappPayload(text: string, messageId: string) {
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
                phone_number_id: phoneNumberId
              },
              contacts: [
                {
                  wa_id: customerPhone,
                  profile: { name: "Sara Ali" }
                }
              ],
              messages: [
                {
                  from: customerPhone,
                  id: messageId,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: "text",
                  text: { body: text }
                }
              ]
            }
          }
        ]
      }
    ]
  };
}

async function sendSignedWhatsApp(text: string, suffix: string) {
  const payload = JSON.stringify(whatsappPayload(text, `wamid.rag.${suffix}.${Date.now()}`));
  return request(app)
    .post("/api/whatsapp/webhook")
    .set("Content-Type", "application/json")
    .set("X-Hub-Signature-256", signPayload(payload))
    .send(payload)
    .expect(200);
}

describe("RAG, lead generation, and booking automation", () => {
  beforeAll(async () => {
    const unique = Date.now();
    phoneNumberId = `rag-phone-${unique}`;
    customerPhone = `97155${unique.toString().slice(-7)}`;

    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        organizationName: `RAG Tenant ${unique}`,
        name: "RAG Admin",
        email: `rag-admin-${unique}@example.ae`,
        password: "StrongPass123!"
      })
      .expect(201);

    accessToken = registerResponse.body.tokens.accessToken;
    organizationId = registerResponse.body.organization.id;

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        whatsappPhoneNumberId: phoneNumberId,
        whatsappBusinessAccountId: `rag-waba-${unique}`
      }
    });

    for (const dayOfWeek of [0, 1, 2, 3, 4, 5, 6]) {
      await prisma.businessHour.create({
        data: {
          organizationId,
          dayOfWeek,
          opensAt: "09:00",
          closesAt: "17:00",
          slotMinutes: 30,
          timezone: "Asia/Dubai"
        }
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("uploads a DOCX, embeds chunks, and returns vector search results", async () => {
    const docx = await createDocxBuffer(
      "Premium WhatsApp automation package costs AED 1499 and includes AI appointment booking, CRM lead scoring, and priority support."
    );

    const uploadResponse = await request(app)
      .post("/api/knowledge/documents")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("file", docx, {
        filename: "pricing.docx",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      })
      .expect(202);

    expect(uploadResponse.body.status).toBe("queued");
    expect(uploadResponse.body.data.status).toBe("PENDING");

    const processedDocument = await processQueuedKnowledgeDocument(uploadResponse.body.data.id);
    expect(processedDocument.status).toBe("READY");
    expect(processedDocument.chunks.length).toBeGreaterThan(0);

    const searchResponse = await request(app)
      .get("/api/knowledge/search")
      .set("Authorization", `Bearer ${accessToken}`)
      .query({ q: "premium package pricing", limit: 2 })
      .expect(200);

    expect(searchResponse.body.data.length).toBeGreaterThan(0);
    expect(searchResponse.body.data[0].content).toContain("Premium WhatsApp automation");
  });

  it("creates a lead from chat details and uses RAG in the AI response", async () => {
    const response = await sendSignedWhatsApp(
      "My name is Sara Ali from Palm Realty. Email sara@example.ae. Can I get pricing for the premium package?",
      "lead"
    );

    const result = response.body.results[0];
    expect(result.status).toBe("responded");
    expect(result.leadId).toBeTruthy();
    expect(result.ragChunks).toBeGreaterThan(0);

    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: result.leadId } });
    expect(lead.email).toBe("sara@example.ae");
    expect(lead.company).toContain("Palm Realty");
    expect(lead.score).toBeGreaterThanOrEqual(70);
  });

  it("proposes slots and saves an appointment on confirmation", async () => {
    const bookingResponse = await sendSignedWhatsApp(
      "I want to book an appointment for a demo",
      "booking"
    );
    expect(bookingResponse.body.results[0].status).toBe("responded");
    expect(bookingResponse.body.results[0].reply).toContain("Available slots");

    const confirmResponse = await sendSignedWhatsApp("slot 1", "confirm");
    const result = confirmResponse.body.results[0];

    expect(result.status).toBe("responded");
    expect(result.appointmentId).toBeTruthy();

    const appointment = await prisma.appointment.findUniqueOrThrow({
      where: { id: result.appointmentId }
    });
    expect(appointment.organizationId).toBe(organizationId);
    expect(appointment.customerId).toBeTruthy();
    expect(appointment.status).toBe("CONFIRMED");
  });
});
