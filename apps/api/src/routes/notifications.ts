import { Router } from "express";
import { NotificationStatus, prisma } from "@dubai-ai/db";
import { z } from "zod";
import { authenticate, enforceTenant } from "../middleware/auth.js";
import { HttpError } from "../lib/http-error.js";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate, enforceTenant);

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const organizationId = req.tenantId!;
    const userId = req.auth!.userId;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;

    const notifications = await prisma.notification.findMany({
      where: {
        organizationId,
        OR: [{ userId: null }, { userId }],
        ...(status ? { status: status as NotificationStatus } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    res.json({ data: notifications });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch("/:id/read", async (req, res, next) => {
  try {
    const organizationId = req.tenantId!;
    const existing = await prisma.notification.findFirst({
      where: { id: req.params.id, organizationId }
    });

    if (!existing) {
      throw new HttpError(404, "Notification not found", "NOTIFICATION_NOT_FOUND");
    }

    const notification = await prisma.notification.update({
      where: { id: existing.id },
      data: { status: NotificationStatus.READ, readAt: new Date() }
    });

    res.json({ data: notification });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/mark-all-read", async (req, res, next) => {
  try {
    const organizationId = req.tenantId!;
    const userId = req.auth!.userId;

    await prisma.notification.updateMany({
      where: {
        organizationId,
        OR: [{ userId: null }, { userId }],
        status: NotificationStatus.UNREAD
      },
      data: { status: NotificationStatus.READ, readAt: new Date() }
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
