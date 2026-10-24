import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { authenticate, enforceTenant } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/rate-limit.js";
import {
  getAuthenticatedProfile,
  login,
  registerOrganization,
  rotateRefreshToken,
  changePassword
} from "../services/auth-service.js";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "@dubai-ai/db";
import bcrypt from "bcryptjs";

export const authRouter = Router();

const registerSchema = z.object({
  organizationName: z.string().min(2).max(120),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(10).max(128)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10).max(128)
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  resetToken: z.string().min(32),
  newPassword: z.string().min(10).max(128)
});

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

authRouter.post("/register", authRateLimiter, async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const result = await registerOrganization(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", authRateLimiter, async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const result = await login(payload);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const payload = refreshSchema.parse(req.body);
    const result = await rotateRefreshToken(payload.refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", authenticate, enforceTenant, async (req, res, next) => {
  try {
    const result = await getAuthenticatedProfile(req.auth!.userId, req.tenantId!);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/change-password", authenticate, enforceTenant, async (req, res, next) => {
  try {
    const payload = changePasswordSchema.parse(req.body);
    const result = await changePassword({
      userId: req.auth!.userId,
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword
    });
    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/forgot-password", authRateLimiter, async (req, res, next) => {
  try {
    const payload = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    const genericMessage =
      "If an account exists, a password reset link has been sent to your email.";

    if (!user) {
      return res.json({ success: true, message: genericMessage });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    });

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt }
    });

    res.json({
      success: true,
      message: genericMessage,
      _debug_resetToken: process.env.NODE_ENV === "development" ? resetToken : undefined
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/reset-password", authRateLimiter, async (req, res, next) => {
  try {
    const payload = resetPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (!user) {
      throw new HttpError(404, "User not found", "USER_NOT_FOUND");
    }

    const tokenHash = hashToken(payload.resetToken);
    const record = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!record) {
      throw new HttpError(400, "Invalid or expired reset token", "INVALID_RESET_TOKEN");
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() }
      }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { revokedAt: new Date() }
      })
    ]);

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", authenticate, async (req, res, next) => {
  try {
    // Revoke all refresh tokens for the current user
    await prisma.refreshToken.updateMany({
      where: {
        userId: req.auth!.userId,
        organizationId: req.auth!.organizationId
      },
      data: {
        revokedAt: new Date()
      }
    });

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
});
