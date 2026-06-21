import nodemailer from "nodemailer";
import { config } from "../config.js";

type EmailInput = {
  to?: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

let transporter: any = null;

function getTransporter() {
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
    return null;
  }

  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 10
  });

  return transporter;
}

export async function sendEmail(input: EmailInput, retries = 2): Promise<{ mocked: boolean; messageId?: string; error?: string }> {
  const to = input.to ?? config.ALERT_EMAIL_TO;

  if (!to) {
    console.warn("[Email service] no recipient configured", { subject: input.subject });
    return { mocked: true };
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[Email service] SMTP not configured, mocking email", {
      to,
      subject: input.subject
    });
    return { mocked: true };
  }

  try {
    const result = await transporter.sendMail({
      from: config.EMAIL_FROM,
      to,
      replyTo: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html
    });

    console.log("[Email service] email sent successfully", {
      to,
      subject: input.subject,
      messageId: result.messageId
    });

    return { mocked: false, messageId: result.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Email service] failed to send email", {
      to,
      subject: input.subject,
      error: errorMessage,
      retries
    });

    // Retry on temporary failures
    if (retries > 0 && (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("ECONNREFUSED"))) {
      console.log("[Email service] retrying after failure", { to, subject: input.subject, retriesLeft: retries - 1 });
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 1000 * (3 - retries)));
      return sendEmail(input, retries - 1);
    }

    return { mocked: false, error: errorMessage };
  }
}

export async function sendHighScoringLeadAlert(input: {
  organizationName: string;
  leadName: string;
  phone: string;
  email?: string | null;
  score: number;
}) {
  return sendEmail({
    subject: `High-scoring lead: ${input.leadName} (${input.score})`,
    text: [
      `Organization: ${input.organizationName}`,
      `Lead: ${input.leadName}`,
      `Phone: ${input.phone}`,
      `Email: ${input.email ?? "not provided"}`,
      `Score: ${input.score}`
    ].join("\n")
  });
}

export async function sendContactInquiryEmail(input: {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message: string;
  locale?: string;
}) {
  return sendEmail({
    subject: `Contact inquiry: ${input.name}`,
    text: [
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Company: ${input.company ?? "not provided"}`,
      `Phone: ${input.phone ?? "not provided"}`,
      `Locale: ${input.locale ?? "en"}`,
      "",
      input.message
    ].join("\n")
  });
}

export async function sendFailedPaymentAlert(input: {
  organizationName: string;
  planName?: string;
  stripeCustomerId?: string | null;
}) {
  return sendEmail({
    subject: `Failed payment: ${input.organizationName}`,
    text: [
      `Organization: ${input.organizationName}`,
      `Plan: ${input.planName ?? "unknown"}`,
      `Stripe customer: ${input.stripeCustomerId ?? "unknown"}`
    ].join("\n")
  });
}
