import bcrypt from "bcryptjs";
import { Router } from "express";
import { UserRole, prisma } from "@dubai-ai/db";
import { z } from "zod";
import { authenticate, enforceTenant } from "../middleware/auth.js";
import { assertSeatLimit } from "../services/plan-limits.js";

export const teamRouter = Router();

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
  role: z.nativeEnum(UserRole)
});

const updateUserSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional()
});

teamRouter.use(authenticate, enforceTenant);

teamRouter.get("/", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { organizationId: req.tenantId! },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true
      }
    });
    res.json({ data: users });
  } catch (error) {
    next(error);
  }
});

teamRouter.post("/invite", async (req, res, next) => {
  try {
    const payload = inviteSchema.parse(req.body);
    await assertSeatLimit(req.tenantId!);
    const temporaryPassword = `Invite${Math.random().toString(36).slice(2, 8)}!1`;
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const user = await prisma.user.upsert({
      where: { email: payload.email.toLowerCase() },
      update: {
        name: payload.name,
        role: payload.role,
        organizationId: req.tenantId!,
        isActive: true
      },
      create: {
        organizationId: req.tenantId!,
        email: payload.email.toLowerCase(),
        name: payload.name,
        role: payload.role,
        passwordHash,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    console.log("[Team invite mock] email invite", {
      to: user.email,
      temporaryPassword
    });

    res.status(201).json({ user, temporaryPassword });
  } catch (error) {
    next(error);
  }
});

teamRouter.patch("/:id", async (req, res, next) => {
  try {
    const payload = updateUserSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id, organizationId: req.tenantId! },
      data: payload,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
});
