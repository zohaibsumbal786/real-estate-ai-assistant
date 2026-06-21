import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";
import { inputValidationMiddleware } from "./middleware/input-validation.js";
import { addRequestIdHeader, requestLoggingMiddleware } from "./middleware/request-logging.js";
import { ipRateLimiter } from "./middleware/rate-limit.js";
import { analyticsRouter } from "./routes/analytics.js";
import { appointmentsRouter } from "./routes/appointments.js";
import { authRouter } from "./routes/auth.js";
import { billingRouter, billingWebhookRouter } from "./routes/billing.js";
import { contactRouter } from "./routes/contact.js";
import { conversationsRouter } from "./routes/conversations.js";
import { customersRouter } from "./routes/customers.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { knowledgeRouter } from "./routes/knowledge.js";
import { leadsRouter } from "./routes/leads.js";
import { notificationsRouter } from "./routes/notifications.js";
import { settingsRouter } from "./routes/settings.js";
import { teamRouter } from "./routes/team.js";
import { whatsappRouter } from "./routes/whatsapp.js";
import { workersRouter } from "./routes/workers.js";

export function createApp() {
  const app = express();

  app.use(helmet({
    // Enhanced security headers
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'", "data:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"]
      }
    },
    // Prevent MIME type sniffing
    noSniff: true,
    // Enable XSS protection
    xssFilter: true,
    // Prevent clickjacking
    frameguard: { action: "deny" }
  }));
  
  // Parse CORS origins from config (comma-separated)
  const corsOrigins = config.WEB_ORIGIN.split(",").map((origin) => origin.trim());
  
  // Enhanced CORS configuration
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Request-ID",
        "X-API-Key",
        "Accept",
        "Accept-Language"
      ],
      exposedHeaders: [
        "Content-Type",
        "X-Request-ID",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset"
      ],
      maxAge: 3600, // 1 hour
      optionsSuccessStatus: 200
    })
  );
  
  app.use(ipRateLimiter);

  // Stripe webhook raw body must be captured BEFORE JSON parsing for signature verification
  app.use("/api/billing/webhook", express.raw({ type: "application/json" }), billingWebhookRouter);

  // JSON parser with raw body capture for other routes
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buffer) => {
        (req as express.Request).rawBody = Buffer.from(buffer);
      }
    })
  );
  app.use(morgan(config.NODE_ENV === "test" ? "tiny" : "dev"));
  app.use(inputValidationMiddleware);
  app.use(addRequestIdHeader);
  app.use(requestLoggingMiddleware);

  // Root endpoint
  app.get("/", (_req, res) => {
    res.json({
      name: "Dubai AI Business Agent API",
      version: "0.1.0",
      status: "running",
      documentation: "https://github.com/dubai-ai/docs",
      health: "/health",
      endpoints: {
        auth: "/api/auth",
        analytics: "/api/analytics",
        appointments: "/api/appointments",
        billing: "/api/billing",
        contact: "/api/contact",
        dashboard: "/api/dashboard",
        conversations: "/api/conversations",
        customers: "/api/customers",
        knowledge: "/api/knowledge",
        leads: "/api/leads",
        notifications: "/api/notifications",
        settings: "/api/settings",
        team: "/api/team",
        whatsapp: "/api/whatsapp"
      }
    });
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "dubai-ai-business-agent-api" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/appointments", appointmentsRouter);
  app.use("/api/billing", billingRouter);
  app.use("/api/contact", contactRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/conversations", conversationsRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/knowledge", knowledgeRouter);
  app.use("/api/leads", leadsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/team", teamRouter);
  app.use("/api/workers", workersRouter);
  app.use("/api/whatsapp", whatsappRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
