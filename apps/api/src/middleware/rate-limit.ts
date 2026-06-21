import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";
import { HttpError } from "../lib/http-error.js";

type Bucket = {
  count: number;
  resetAt: number;
};

const orgBuckets = new Map<string, Bucket>();

// Extract IP address from request (handles IPv6 localhost and proxies)
function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = typeof forwarded === "string" ? forwarded.split(",") : forwarded;
    return (ips[0] || "unknown").trim();
  }
  return req.socket.remoteAddress || "unknown";
}

// Clean up expired buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [orgId, bucket] of orgBuckets.entries()) {
    if (bucket.resetAt <= now) {
      orgBuckets.delete(orgId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log("[Rate limit] cleaned up", cleaned, "expired buckets");
  }
}, 5 * 60 * 1000);

export const ipRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  limit: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please slow down and try again."
    }
  },
  skip: (req) => {
    // Don't rate limit health checks
    return req.path === "/health";
  }
});

// Stricter limit for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 10, // 10 requests per 5 minutes - allows rapid retries during development/testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "AUTH_RATE_LIMITED",
      message: "Too many authentication attempts. Please try again later."
    }
  },
  keyGenerator: (req) => {
    // Rate limit by IP + email for login attempts
    const ip = getClientIp(req);
    const email = req.body?.email || "unknown";
    return `${ip}-${email}`;
  }
});

// Limit for API endpoints with webhook calls (Stripe, Meta)
export const webhookRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 30, // 30 requests per minute (Stripe sends rapidly during failures)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "WEBHOOK_RATE_LIMITED",
      message: "Webhook rate limit exceeded"
    }
  }
});

export function orgRateLimiter(req: Request, _res: Response, next: NextFunction) {
  const organizationId = req.tenantId;

  if (!organizationId) {
    return next();
  }

  const now = Date.now();
  const existing = orgBuckets.get(organizationId);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + config.RATE_LIMIT_WINDOW_MS };

  bucket.count += 1;
  orgBuckets.set(organizationId, bucket);

  if (bucket.count > config.ORG_RATE_LIMIT_MAX) {
    return next(new HttpError(429, "Organization rate limit exceeded", "ORG_RATE_LIMITED"));
  }

  return next();
}
