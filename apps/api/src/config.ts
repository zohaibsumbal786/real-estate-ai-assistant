import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  REDIS_OPTIONAL: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  META_APP_SECRET: z.string().min(8),
  META_VERIFY_TOKEN: z.string().min(8),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  OPENAI_MOCK_RESPONSES: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  STRIPE_MOCK_CHECKOUT: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  BILLING_SUCCESS_URL: z.string().url().default("http://localhost:3000/en/dashboard?billing=success"),
  BILLING_CANCEL_URL: z.string().url().default("http://localhost:3000/en/dashboard?billing=cancelled"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  ORG_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1500),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("Dubai AI Business Agent <no-reply@localhost>"),
  ALERT_EMAIL_TO: z.string().email().optional()
});

export const config = envSchema.parse(process.env);
