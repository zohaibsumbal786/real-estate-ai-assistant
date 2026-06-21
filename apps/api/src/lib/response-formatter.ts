import type { Response } from "express";

/**
 * Standardized API response wrapper
 * All API responses should follow this format for consistency
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  code: string;
  message?: string;
  data?: T;
  meta?: {
    requestId?: string;
    timestamp?: string;
    duration?: string;
  };
}

/**
 * Send a successful API response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  options?: {
    statusCode?: number;
    message?: string;
    code?: string;
  }
) {
  const response: ApiResponse<T> = {
    success: true,
    code: options?.code || "OK",
    message: options?.message,
    data,
    meta: {
      timestamp: new Date().toISOString()
    }
  };

  return res.status(options?.statusCode || 200).json(response);
}

/**
 * Send an error API response
 */
export function sendError(
  res: Response,
  options: {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
  }
) {
  const response: any = {
    success: false,
    code: options.code,
    message: options.message,
    meta: {
      timestamp: new Date().toISOString()
    }
  };

  if (options.details) {
    response.details = options.details;
  }

  return res.status(options.statusCode).json(response);
}

/**
 * Middleware to add response helper methods to Response object
 */
export function responseFormattingMiddleware(
  req: any,
  res: any,
  next: any
) {
  const startTime = Date.now();
  const requestId = req.requestId || crypto.randomUUID();

  res.sendSuccess = function <T>(
    data: T,
    options?: {
      statusCode?: number;
      message?: string;
      code?: string;
    }
  ) {
    const duration = Date.now() - startTime;
    const response: ApiResponse<T> = {
      success: true,
      code: options?.code || "OK",
      message: options?.message,
      data,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`
      }
    };

    return this.status(options?.statusCode || 200).json(response);
  };

  res.sendError = function (options: {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
  }) {
    const duration = Date.now() - startTime;
    const response: any = {
      success: false,
      code: options.code,
      message: options.message,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`
      }
    };

    if (options.details) {
      response.details = options.details;
    }

    return this.status(options.statusCode).json(response);
  };

  next();
}
