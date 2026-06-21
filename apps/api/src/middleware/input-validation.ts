import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error.js";

/**
 * Sanitize string input to prevent XSS attacks
 */
function sanitizeString(value: string | null | undefined): string | null | undefined {
  if (!value || typeof value !== "string") {
    return value;
  }

  // Remove script tags and dangerous HTML
  let sanitized = value
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "")
    .replace(/<on\w+\s*=\s*["'][^"']*["']/gi, "")
    .trim();

  return sanitized;
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive fields from being logged
      if (
        key.toLowerCase().includes("password") ||
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("secret")
      ) {
        sanitized[key] = value;
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Middleware to sanitize and validate incoming request bodies
 */
export function inputValidationMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    // Only sanitize POST/PUT/PATCH requests
    if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
      // Skip raw body requests (like Stripe webhooks)
      if (Buffer.isBuffer(req.body)) {
        return next();
      }

      // Sanitize the body
      req.body = sanitizeObject(req.body);

      // Additional validation for suspicious patterns
      const bodyString = JSON.stringify(req.body).toLowerCase();

      // Check for SQL injection patterns
      const sqlInjectionPatterns = [
        /(\b(union|select|insert|update|delete|drop|create|alter)\b.*(?:from|into|table|where|values))/i,
        /(;.*(drop|delete|insert|update|alter|create))/i,
        /(\bor\b\s+\d+\s*=\s*\d+)/i,
        /(\band\b\s+\d+\s*=\s*\d+)/i
      ];

      if (sqlInjectionPatterns.some((pattern) => pattern.test(bodyString))) {
        console.warn("[Input validation] potential SQL injection detected", {
          path: req.path,
          method: req.method,
          ip: req.ip
        });
        return next(new HttpError(400, "Invalid input format", "INVALID_INPUT"));
      }
    }

    next();
  } catch (error) {
    console.error("[Input validation] error", error);
    next(error);
  }
}

export { sanitizeString };

