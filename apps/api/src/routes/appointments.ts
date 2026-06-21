import { AppointmentStatus, prisma } from "@dubai-ai/db";
import { Router } from "express";
import { z } from "zod";
import { authenticate, enforceTenant } from "../middleware/auth.js";
import { HttpError } from "../lib/http-error.js";

export const appointmentsRouter = Router();

const createSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  customerId: z.string().optional(),
  leadId: z.string().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1)
});

const updateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  startsAt: z.string().min(1).optional(),
  endsAt: z.string().min(1).optional(),
  status: z.nativeEnum(AppointmentStatus).optional()
});

appointmentsRouter.use(authenticate, enforceTenant);

appointmentsRouter.get("/", async (req, res, next) => {
  try {
    const organizationId = req.tenantId!;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
    const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;

    const appointments = await prisma.appointment.findMany({
      where: {
        organizationId,
        // Exclude cancelled appointments by default unless specifically requested
        ...(status ? { status: status as AppointmentStatus } : { status: { not: AppointmentStatus.CANCELLED } }),
        ...(from || to
          ? {
              startsAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {})
              }
            }
          : {})
      },
      orderBy: { startsAt: "asc" },
      include: {
        customer: true,
        lead: true,
        user: { select: { id: true, name: true } }
      }
    });

    res.json({ data: appointments });
  } catch (error) {
    next(error);
  }
});

appointmentsRouter.post("/", async (req, res, next) => {
  try {
    const organizationId = req.tenantId!;
    const payload = createSchema.parse(req.body);

    const startsAt = new Date(payload.startsAt);
    const endsAt = new Date(payload.endsAt);

    // Validate time range
    if (startsAt >= endsAt) {
      throw new HttpError(
        400,
        "Appointment end time must be after start time",
        "INVALID_TIME_RANGE"
      );
    }

    // Validate appointment is not in the past
    if (startsAt < new Date()) {
      throw new HttpError(400, "Cannot schedule appointment in the past", "PAST_APPOINTMENT");
    }

    // Validate appointment duration (max 8 hours)
    const durationHours = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60);
    if (durationHours > 8) {
      throw new HttpError(400, "Appointment duration cannot exceed 8 hours", "DURATION_TOO_LONG");
    }

    const appointment = await prisma.appointment.create({
      data: {
        organizationId,
        userId: req.auth!.userId,
        title: payload.title,
        description: payload.description,
        location: payload.location,
        customerId: payload.customerId,
        leadId: payload.leadId,
        startsAt,
        endsAt,
        status: AppointmentStatus.SCHEDULED,
        source: "MANUAL"
      },
      include: { customer: true, lead: true }
    });

    res.status(201).json({ data: appointment });
  } catch (error) {
    next(error);
  }
});

appointmentsRouter.patch("/:id", async (req, res, next) => {
  try {
    const organizationId = req.tenantId!;
    const payload = updateSchema.parse(req.body);

    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.id, organizationId }
    });

    if (!existing) {
      throw new HttpError(404, "Appointment not found", "APPOINTMENT_NOT_FOUND");
    }

    // Validate time range if times are being updated
    if (payload.startsAt || payload.endsAt) {
      const startsAt = payload.startsAt ? new Date(payload.startsAt) : existing.startsAt;
      const endsAt = payload.endsAt ? new Date(payload.endsAt) : existing.endsAt;

      if (startsAt >= endsAt) {
        throw new HttpError(
          400,
          "Appointment end time must be after start time",
          "INVALID_TIME_RANGE"
        );
      }

      // Don't allow updating to past time for SCHEDULED appointments
      if (
        payload.startsAt &&
        existing.status === AppointmentStatus.SCHEDULED &&
        startsAt < new Date()
      ) {
        throw new HttpError(400, "Cannot reschedule appointment to the past", "PAST_APPOINTMENT");
      }

      // Validate duration
      const durationHours = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60);
      if (durationHours > 8) {
        throw new HttpError(400, "Appointment duration cannot exceed 8 hours", "DURATION_TOO_LONG");
      }
    }

    const appointment = await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        ...(payload.title ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.location !== undefined ? { location: payload.location } : {}),
        ...(payload.startsAt ? { startsAt: new Date(payload.startsAt) } : {}),
        ...(payload.endsAt ? { endsAt: new Date(payload.endsAt) } : {}),
        ...(payload.status ? { status: payload.status } : {})
      },
      include: { customer: true, lead: true }
    });

    res.json({ data: appointment });
  } catch (error) {
    next(error);
  }
});

appointmentsRouter.delete("/:id", async (req, res, next) => {
  try {
    const organizationId = req.tenantId!;
    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.id, organizationId }
    });

    if (!existing) {
      throw new HttpError(404, "Appointment not found", "APPOINTMENT_NOT_FOUND");
    }

    await prisma.appointment.update({
      where: { id: existing.id },
      data: { status: AppointmentStatus.CANCELLED }
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
