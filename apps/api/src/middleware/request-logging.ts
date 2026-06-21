import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";

const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLevel = config.NODE_ENV === "development" ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO;

/**
 * Middleware to log incoming requests and outgoing responses
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  // Store request ID for reference
  (req as any).requestId = requestId;

  // Skip logging for health checks to reduce noise
  if (req.path === "/health") {
    return next();
  }

  // Capture the original response.json to log responses
  const originalJson = res.json.bind(res);
  let responseBody: unknown = null;

  res.json = function (body: unknown) {
    responseBody = body;
    return originalJson(body);
  };

  // Capture the original res.send to log error responses
  const originalSend = res.send.bind(res);
  res.send = function (data: unknown) {
    if (res.statusCode >= 400) {
      responseBody = data;
    }
    return originalSend(data);
  };

  // Log when response is finished
  res.on("finish", () => {
    const duration = Date.now() - startTime;

    // Log based on status code
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: (req as any).auth?.userId,
      organizationId: (req as any).tenantId
    };

    if (res.statusCode < 400) {
      if (currentLevel <= LOG_LEVEL.DEBUG) {
        console.log(`[${req.method}] ${req.path} - ${res.statusCode}`, logData);
      }
    } else if (res.statusCode < 500) {
      console.warn(`[${req.method}] ${req.path} - ${res.statusCode}`, logData);
    } else {
      console.error(`[${req.method}] ${req.path} - ${res.statusCode}`, logData);
    }
  });

  next();
}

/**
 * Add request ID to response headers for tracing
 */
export function addRequestIdHeader(req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).requestId || crypto.randomUUID();
  res.setHeader("X-Request-ID", requestId);
  next();
}
