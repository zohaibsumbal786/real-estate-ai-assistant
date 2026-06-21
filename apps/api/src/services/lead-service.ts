import OpenAI from "openai";
import { LeadStatus, type Customer, prisma } from "@dubai-ai/db";
import { config } from "../config.js";
import type { Intent } from "./ai-engine.js";
import { sendHighScoringLeadAlert } from "./email-service.js";

export type LeadExtraction = {
  hasLeadSignal: boolean;
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  notes?: string;
};

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+?\d[\d\s().-]{7,}\d)/;

export async function extractLeadDetails(text: string): Promise<LeadExtraction> {
  if (config.OPENAI_MOCK_RESPONSES || !config.OPENAI_API_KEY) {
    return mockExtractLeadDetails(text);
  }

  const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: config.OPENAI_MODEL,
    instructions:
      "Extract CRM lead details from the customer message. Return only JSON. If no lead signal exists, set hasLeadSignal false.",
    input: text,
    text: {
      format: {
        type: "json_schema",
        name: "lead_extraction",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            hasLeadSignal: { type: "boolean" },
            name: { type: ["string", "null"] },
            phone: { type: ["string", "null"] },
            email: { type: ["string", "null"] },
            company: { type: ["string", "null"] },
            notes: { type: ["string", "null"] }
          },
          required: ["hasLeadSignal", "name", "phone", "email", "company", "notes"]
        }
      }
    }
  });

  return JSON.parse(response.output_text) as LeadExtraction;
}

export async function upsertLeadFromConversation(input: {
  organizationId: string;
  customer: Customer;
  conversationId: string;
  messageText: string;
  intent: Intent;
}) {
  const extraction = await extractLeadDetails(input.messageText);
  const shouldCreateLead =
    extraction.hasLeadSignal ||
    ["sales", "booking"].includes(input.intent) ||
    Boolean(extraction.email || extraction.phone || extraction.company);

  if (!shouldCreateLead) {
    return null;
  }

  const phone = normalizePhone(extraction.phone) ?? input.customer.phone;
  const email = extraction.email?.toLowerCase();
  const name = extraction.name || input.customer.name || phone;
  const company = extraction.company;
  const score = await calculateLeadScore({
    organizationId: input.organizationId,
    conversationId: input.conversationId,
    messageText: input.messageText,
    intent: input.intent,
    captured: {
      phone,
      email,
      name,
      company
    }
  });

  const status =
    score >= 70 ? LeadStatus.QUALIFIED : score >= 50 ? LeadStatus.CONTACTED : LeadStatus.NEW;

  const existingLead = await prisma.lead.findFirst({
    where: {
      organizationId: input.organizationId,
      OR: [
        { phone },
        ...(email ? [{ email }] : [])
      ]
    },
    orderBy: { updatedAt: "desc" }
  });

  if (existingLead) {
    const lead = await prisma.lead.update({
      where: { id: existingLead.id },
      data: {
        customerId: input.customer.id,
        name,
        phone,
        email,
        company,
        score,
        status,
        notes: mergeNotes(existingLead.notes, extraction.notes)
      }
    });
    await notifyHighScoringLead(input.organizationId, lead);
    return lead;
  }

  const lead = await prisma.lead.create({
    data: {
      organizationId: input.organizationId,
      customerId: input.customer.id,
      name,
      phone,
      email,
      company,
      score,
      status,
      notes: extraction.notes
    }
  });
  await notifyHighScoringLead(input.organizationId, lead);
  return lead;
}

export async function calculateLeadScore(input: {
  organizationId: string;
  conversationId: string;
  messageText: string;
  intent: Intent;
  captured: {
    phone?: string;
    email?: string;
    name?: string;
    company?: string;
  };
}) {
  // Intent weighting - most important factor for lead quality
  const intentWeights = {
    sales: 40,      // Direct purchase intent
    booking: 38,    // Appointment/booking request
    support: 15,    // Could be upsell opportunity
    complaint: 8,   // Negative, but engaging
    other: 5        // Low signal
  };
  const intentScore = intentWeights[input.intent];

  // Contact information weighting - concrete lead data
  const contactDataScore =
    (input.captured.email ? 15 : 0) +      // Email is most valuable
    (input.captured.phone ? 12 : 0) +      // Phone is valuable
    (input.captured.name ? 8 : 0) +        // Name confirms identity
    (input.captured.company ? 5 : 0);      // Company context

  // Engagement metrics with recency - more recent = higher value
  const messages = await prisma.message.findMany({
    where: {
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      direction: "INBOUND"
    },
    orderBy: { sentAt: "desc" },
    take: 20
  });

  const messageCount = messages.length;
  
  // Recency multiplier: messages in last 24hr get full weight, older messages discounted
  const now = new Date();
  let recencyScore = 0;
  messages.forEach((msg, index) => {
    const ageHours = (now.getTime() - msg.sentAt.getTime()) / (1000 * 60 * 60);
    // Recent messages (0-24hr): full weight
    // Older messages: exponential decay
    const recencyMultiplier = ageHours < 24 ? 1.0 : Math.pow(0.8, Math.floor(ageHours / 24));
    recencyScore += recencyMultiplier;
  });

  // Normalize recency score to max 20
  const engagementScore = Math.min(recencyScore * 2, 20);

  // Message text analysis - urgency and purchase intent
  const urgencyKeywords = /\b(buy|purchase|price|quote|quotation|urgent|today|tomorrow|ASAP|immediately|visit|appointment|meeting|demo|book|reservation|confirm)\b/i;
  const urgencyScore = urgencyKeywords.test(input.messageText) ? 12 : 0;

  // Bonus for detailed messages (shows serious intent)
  const detailBonus = input.messageText.length > 100 ? 3 : 0;

  // Calculate final score: max 100
  const totalScore = intentScore + contactDataScore + engagementScore + urgencyScore + detailBonus;
  return Math.min(100, Math.round(totalScore));
}

function mockExtractLeadDetails(text: string): LeadExtraction {
  const email = text.match(emailPattern)?.[0];
  const phone = text.match(phonePattern)?.[0];
  const company = text.match(/\b(?:company|from|at)\s+([A-Z][A-Za-z0-9 &.-]{2,})/)?.[1];
  const name = text.match(/\b(?:my name is|this is|i am|i'm)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)/i)?.[1];

  const hasLeadSignal = Boolean(
    email ||
      phone ||
      company ||
      /\b(price|quote|buy|package|plan|meeting|appointment|demo|visit)\b/i.test(text)
  );

  return {
    hasLeadSignal,
    name,
    phone,
    email,
    company,
    notes: hasLeadSignal ? text : undefined
  };
}

function normalizePhone(phone?: string) {
  return phone?.replace(/[^\d+]/g, "");
}

function mergeNotes(existingNotes?: string | null, newNotes?: string) {
  if (!newNotes) {
    return existingNotes;
  }

  return existingNotes ? `${existingNotes}\n${newNotes}` : newNotes;
}

async function notifyHighScoringLead(
  organizationId: string,
  lead: { name: string; phone: string; email?: string | null; score: number }
) {
  if (lead.score < 70) {
    return;
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true }
  });

  await sendHighScoringLeadAlert({
    organizationName: organization?.name ?? organizationId,
    leadName: lead.name,
    phone: lead.phone,
    email: lead.email,
    score: lead.score
  });
}
