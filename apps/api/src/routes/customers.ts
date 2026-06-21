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
    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
});
