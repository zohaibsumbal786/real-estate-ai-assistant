import { Router } from "express";
import { LeadStatus, prisma } from "@dubai-ai/db";
import { z } from "zod";
import { authenticate, enforceTenant } from "../middleware/auth.js";

export const leadsRouter = Router();

const querySchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  assignedToId: z.string().optional()
});

const updateLeadSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  assignedToId: z.string().nullable().optional()
});

const createLeadSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(6).max(30),
  email: z.string().email().optional(),
  company: z.string().max(120).optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  assignedToId: z.string().optional()
});

leadsRouter.use(authenticate, enforceTenant);

leadsRouter.get("/", async (req, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    const leads = await prisma.lead.findMany({
      where: {
        organizationId: req.tenantId!,
        status: query.status,
        score: query.minScore ? { gte: query.minScore } : undefined,
        assignedToId: query.assignedToId
      },
      orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
      include: {
        customer: true,
        assignedTo: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    res.json({ data: leads });
  } catch (error) {
    next(error);
  }
});

leadsRouter.post("/", async (req, res, next) => {
  try {
    const payload = createLeadSchema.parse(req.body);
    const lead = await prisma.lead.create({
      data: {
        organizationId: req.tenantId!,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        company: payload.company,
        status: payload.status ?? LeadStatus.NEW,
        assignedToId: payload.assignedToId,
        source: "MANUAL"
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true } }
      }
    });
    res.status(201).json({ data: lead });
  } catch (error) {
    next(error);
  }
});

leadsRouter.patch("/:id", async (req, res, next) => {
  try {
    const payload = updateLeadSchema.parse(req.body);
    const lead = await prisma.lead.update({
      where: { id: req.params.id, organizationId: req.tenantId! },
      data: payload,
      include: {
        customer: true,
        assignedTo: { select: { id: true, name: true, email: true, role: true } }
      }
    });
    res.json({ data: lead });
  } catch (error) {
    next(error);
  }
});
