import multer from "multer";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "@dubai-ai/db";
import { authenticate, enforceTenant } from "../middleware/auth.js";
import { HttpError } from "../lib/http-error.js";
import { queueKnowledgeDocument, searchKnowledge } from "../services/knowledge-service.js";
import { assertKnowledgeDocumentLimit } from "../services/plan-limits.js";

export const knowledgeRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (allowed.includes(file.mimetype) || /\.(pdf|docx)$/i.test(file.originalname)) {
      callback(null, true);
    } else {
      callback(new Error("Only PDF and DOCX files are supported"));
    }
  }
});

const searchSchema = z.object({
  q: z.string().min(2),
  limit: z.coerce.number().int().min(1).max(10).default(4)
});

knowledgeRouter.use(authenticate, enforceTenant);

knowledgeRouter.post("/documents", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new HttpError(400, "Upload a PDF or DOCX file with field name 'file'", "FILE_REQUIRED");
    }

    await assertKnowledgeDocumentLimit(req.tenantId!);

    const document = await queueKnowledgeDocument({
      organizationId: req.tenantId!,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      buffer: req.file.buffer
    });

    res.status(202).json({
      data: document,
      status: "queued"
    });
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.get("/documents", async (req, res, next) => {
  try {
    const documents = await prisma.knowledgeDocument.findMany({
      where: { organizationId: req.tenantId! },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } }
    });
    res.json({ data: documents });
  } catch (error) {
    next(error);
  }
});

knowledgeRouter.get("/search", async (req, res, next) => {
  try {
    const query = searchSchema.parse(req.query);
    const results = await searchKnowledge({
      organizationId: req.tenantId!,
      query: query.q,
      limit: query.limit
    });
    res.json({ data: results });
  } catch (error) {
    next(error);
  }
});
