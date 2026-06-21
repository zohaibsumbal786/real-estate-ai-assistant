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

authRouter.post("/forgot-password", async (req, res, next) => {
  try {
    const payload = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (!user) {
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        message: "If an account exists, a password reset link has been sent to your email."
      });
    }

    // Generate reset token (in production, store this in DB with 1-hour expiry)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Note: In production, implement proper password reset with a dedicated model
    // For now, we're just logging that a reset was requested
    console.log("[Auth] Password reset token generated for", user.email);
    console.log("[Auth] Reset token:", resetToken); // Don't log in production!

    res.json({
      success: true,
      message: "If an account exists, a password reset link has been sent to your email.",
      _debug_resetToken: process.env.NODE_ENV === "development" ? resetToken : undefined
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const payload = resetPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (!user) {
      throw new HttpError(404, "User not found", "USER_NOT_FOUND");
    }

    // TODO: Implement proper password reset with token verification
    // For now, this is a placeholder. In production:
    // 1. Create a PasswordResetToken model with user_id, token, expires_at
    // 2. Store the hashed token there
    // 3. Verify against stored token before allowing password update

    throw new HttpError(400, "Password reset not yet fully implemented", "NOT_IMPLEMENTED");
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
