import { Router } from "express";
import { z } from "zod";
import { prisma } from "@dubai-ai/db";
import { authenticate, enforceTenant } from "../middleware/auth.js";

export const customersRouter = Router();

const createCustomerSchema = z.object({
  phone: z.string().min(6).max(32),
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional()
});

customersRouter.use(authenticate, enforceTenant);

customersRouter.get("/", async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { organizationId: req.tenantId! },
      orderBy: { createdAt: "desc" }
    });
    res.json({ data: customers });
  } catch (error) {
    next(error);
  }
});

customersRouter.post("/", async (req, res, next) => {
  try {
    const payload = createCustomerSchema.parse(req.body);
    const customer = await prisma.customer.create({
      data: {
        ...payload,
        organizationId: req.tenantId!
      }
    });
    res.status(201).json({ data: customer });
  } catch (error) {
    next(error);
  }
});

customersRouter.patch("/:id", async (req, res, next) => {
  try {
    const payload = createCustomerSchema.partial().parse(req.body);
    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, organizationId: req.tenantId! }
    });
    if (!existing) {
      return res.status(404).json({ error: { message: "Customer not found" } });
    }
    const customer = await prisma.customer.update({
      where: { id: existing.id },
      data: payload
    });
    res.json({ data: customer });
  } catch (error) {
    next(error);
  }
});
