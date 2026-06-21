import { Router } from "express";
import { z } from "zod";
import { prisma } from "@dubai-ai/db";
import { UserRole } from "@dubai-ai/db";
import { authenticate, enforceTenant, requireRole } from "../middleware/auth.js";

export const settingsRouter = Router();

const updateOrgSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().max(30).optional(),
  timezone: z.string().max(60).optional(),
  whatsappPhoneNumberId: z.string().max(120).optional(),
  whatsappBusinessAccountId: z.string().max(120).optional()
});

const businessHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  opensAt: z.string().regex(/^\d{2}:\d{2}$/),
  closesAt: z.string().regex(/^\d{2}:\d{2}$/),
  slotMinutes: z.number().int().min(15).max(120).default(30),
  isActive: z.boolean().default(true)
});

settingsRouter.use(authenticate, enforceTenant);

settingsRouter.get("/organization", async (req, res, next) => {
  try {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: req.tenantId! },
      include: {
        businessHours: { orderBy: [{ dayOfWeek: "asc" }, { opensAt: "asc" }] },
        subscriptions: { include: { plan: true } }
      }
    });

    res.json({ data: organization });
  } catch (error) {
    next(error);
  }
});

settingsRouter.patch(
  "/organization",
  requireRole(UserRole.ADMIN, UserRole.MANAGER),
  async (req, res, next) => {
    try {
      const payload = updateOrgSchema.parse(req.body);
      const organization = await prisma.organization.update({
        where: { id: req.tenantId! },
        data: payload
      });
      res.json({ data: organization });
    } catch (error) {
      next(error);
    }
  }
);

settingsRouter.get("/business-hours", async (req, res, next) => {
  try {
    const hours = await prisma.businessHour.findMany({
      where: { organizationId: req.tenantId! },
      orderBy: [{ dayOfWeek: "asc" }, { opensAt: "asc" }]
    });
    res.json({ data: hours });
  } catch (error) {
    next(error);
  }
});

settingsRouter.put(
  "/business-hours",
  requireRole(UserRole.ADMIN, UserRole.MANAGER),
  async (req, res, next) => {
    try {
      const payload = z.array(businessHourSchema).parse(req.body);
      const organizationId = req.tenantId!;

      await prisma.businessHour.deleteMany({ where: { organizationId } });

      const hours = await prisma.$transaction(
        payload.map((entry) =>
          prisma.businessHour.create({
            data: {
              organizationId,
              dayOfWeek: entry.dayOfWeek,
              opensAt: entry.opensAt,
              closesAt: entry.closesAt,
              slotMinutes: entry.slotMinutes,
              isActive: entry.isActive
            }
          })
        )
      );

      res.json({ data: hours });
    } catch (error) {
      next(error);
    }
  }
);
