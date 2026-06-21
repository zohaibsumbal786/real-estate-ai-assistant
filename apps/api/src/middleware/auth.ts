import type { UserRole } from "@dubai-ai/db";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { orgRateLimiter } from "./rate-limit.js";

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return next(new HttpError(401, "Missing bearer token", "AUTH_REQUIRED"));
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      organizationId: payload.organizationId,
      role: payload.role,
      email: payload.email
    };
    return next();
  } catch {
    return next(new HttpError(401, "Invalid or expired token", "AUTH_INVALID"));
  }
}

export function enforceTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth?.organizationId) {
    return next(new HttpError(401, "Tenant context is required", "TENANT_REQUIRED"));
  }

  req.tenantId = req.auth.organizationId;
  return orgRateLimiter(req, _res, next);
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth?.role || !roles.includes(req.auth.role as UserRole)) {
      return next(new HttpError(403, "Insufficient permissions", "FORBIDDEN"));
    }
    return next();
  };
}
