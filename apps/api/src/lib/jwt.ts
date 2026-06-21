import { randomUUID } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { UserRole } from "@dubai-ai/db";
import { config } from "../config.js";

export type AccessTokenPayload = {
  sub: string;
  organizationId: string;
  role: UserRole;
  email: string;
  type: "access";
};

export type RefreshTokenPayload = {
  sub: string;
  organizationId: string;
  type: "refresh";
};

export function signAccessToken(payload: Omit<AccessTokenPayload, "type">) {
  return jwt.sign(
    { ...payload, type: "access" },
    config.JWT_ACCESS_SECRET,
    {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN,
      jwtid: randomUUID()
    } as SignOptions
  );
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, "type">) {
  return jwt.sign(
    { ...payload, type: "refresh" },
    config.JWT_REFRESH_SECRET,
    {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN,
      jwtid: randomUUID()
    } as SignOptions
  );
}

export function verifyAccessToken(token: string) {
  const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as AccessTokenPayload;
  if (decoded.type !== "access" || !decoded.organizationId) {
    throw new Error("Invalid access token");
  }
  return decoded;
}

export function verifyRefreshToken(token: string) {
  const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  if (decoded.type !== "refresh" || !decoded.organizationId) {
    throw new Error("Invalid refresh token");
  }
  return decoded;
}
