import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { KnowledgeDocumentStatus, prisma } from "@dubai-ai/db";
import { enqueueKnowledgeDocument } from "../queues/knowledge.queue.js";
import { extractTextFromDocument } from "./document-text.js";
import { generateEmbedding, toVectorLiteral } from "./embeddings.js";
import { chunkText } from "./text-chunker.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadRoot = resolve(__dirname, "../../../../storage/uploads");

export type KnowledgeSearchResult = {
  id: string;
  documentId: string;
  content: string;
  distance: number;
  title: string;
};

export async function ingestKnowledgeDocument(input: {
  organizationId: string;
  filename: string;
  mimetype: string;
  buffer: Buffer;
}) {
  const document = await prisma.knowledgeDocument.create({
    data: {
      organizationId: input.organizationId,
      title: input.filename,
      sourceType: "UPLOAD",
      mimeType: input.mimetype,
      status: KnowledgeDocumentStatus.PROCESSING
    }
  });

  try {
    const text = await extractTextFromDocument(input);
    const chunks = chunkText(text);

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.content);
      await prisma.$executeRaw`
        INSERT INTO "KnowledgeChunk" (
          "id", "organizationId", "documentId", "content", "tokenCount", "chunkIndex", "embedding", "createdAt"
        )
        VALUES (
          ${randomUUID()}, ${input.organizationId}, ${document.id}, ${chunk.content}, ${chunk.tokenCount},
          ${chunk.chunkIndex}, ${toVectorLiteral(embedding)}::vector, NOW()
        )
      `;
    }

    const readyDocument = await prisma.knowledgeDocument.update({
      where: { id: document.id },
      data: {
        status: KnowledgeDocumentStatus.READY,
        metadata: {
          chunkCount: chunks.length,
          extractedCharacters: text.length
        }
      },
      include: { chunks: true }
    });

    return readyDocument;
  } catch (error) {
    await prisma.knowledgeDocument.update({
      where: { id: document.id },
      data: {
        status: KnowledgeDocumentStatus.FAILED,
        metadata: {
          error: error instanceof Error ? error.message : "Unknown extraction error"
        }
      }
    });
    throw error;
  }
}

export async function queueKnowledgeDocument(input: {
  organizationId: string;
  filename: string;
  mimetype: string;
  buffer: Buffer;
}) {
  const contentHash = createHash("sha256").update(input.buffer).digest("hex");
  const document = await prisma.knowledgeDocument.create({
    data: {
      organizationId: input.organizationId,
      title: input.filename,
      sourceType: "UPLOAD",
      mimeType: input.mimetype,
      contentHash,
      status: KnowledgeDocumentStatus.PENDING,
      metadata: {
        originalFilename: input.filename,
        byteSize: input.buffer.byteLength
      }
    }
  });

  const organizationDirectory = resolve(uploadRoot, input.organizationId);
  await mkdir(organizationDirectory, { recursive: true });
  const safeFilename = input.filename.replace(/[^a-z0-9._-]/gi, "_");
  const storagePath = resolve(organizationDirectory, `${document.id}-${safeFilename}`);
  await writeFile(storagePath, input.buffer);

  const queuedDocument = await prisma.knowledgeDocument.update({
    where: { id: document.id },
    data: { sourceUrl: storagePath }
  });

  await enqueueKnowledgeDocument(document.id);
  return queuedDocument;
}

export async function processQueuedKnowledgeDocument(documentId: string) {
  const document = await prisma.knowledgeDocument.findUniqueOrThrow({
    where: { id: documentId }
  });

  if (!document.sourceUrl || !document.mimeType) {
    throw new Error(`Knowledge document ${document.id} is missing source file metadata`);
  }

  await prisma.knowledgeDocument.update({
    where: { id: document.id },
    data: { status: KnowledgeDocumentStatus.PROCESSING }
  });

  try {
    const buffer = await readFile(document.sourceUrl);
    const text = await extractTextFromDocument({
      filename: document.title,
      mimetype: document.mimeType,
      buffer
    });
    const chunks = chunkText(text);

    await prisma.knowledgeChunk.deleteMany({
      where: {
        organizationId: document.organizationId,
        documentId: document.id
      }
    });

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.content);
      await prisma.$executeRaw`
        INSERT INTO "KnowledgeChunk" (
          "id", "organizationId", "documentId", "content", "tokenCount", "chunkIndex", "embedding", "createdAt"
        )
        VALUES (
          ${randomUUID()}, ${document.organizationId}, ${document.id}, ${chunk.content}, ${chunk.tokenCount},
          ${chunk.chunkIndex}, ${toVectorLiteral(embedding)}::vector, NOW()
        )
      `;
    }

    return prisma.knowledgeDocument.update({
      where: { id: document.id },
      data: {
        status: KnowledgeDocumentStatus.READY,
        metadata: {
          ...(typeof document.metadata === "object" && document.metadata ? document.metadata : {}),
          chunkCount: chunks.length,
          extractedCharacters: text.length,
          processedAt: new Date().toISOString()
        }
      },
      include: { chunks: true }
    });
  } catch (error) {
    await prisma.knowledgeDocument.update({
      where: { id: document.id },
      data: {
        status: KnowledgeDocumentStatus.FAILED,
        metadata: {
          ...(typeof document.metadata === "object" && document.metadata ? document.metadata : {}),
          error: error instanceof Error ? error.message : "Unknown worker error",
          failedAt: new Date().toISOString()
        }
      }
    });
    throw error;
  }
}

export async function searchKnowledge(input: {
  organizationId: string;
  query: string;
  limit?: number;
}) {
  const embedding = await generateEmbedding(input.query);
  const vector = toVectorLiteral(embedding);
  const limit = input.limit ?? 4;

  return prisma.$queryRaw<KnowledgeSearchResult[]>`
    SELECT
      kc."id",
      kc."documentId",
      kc."content",
      kd."title",
      (kc."embedding" <=> ${vector}::vector) AS "distance"
    FROM "KnowledgeChunk" kc
    INNER JOIN "KnowledgeDocument" kd ON kd."id" = kc."documentId"
    WHERE kc."organizationId" = ${input.organizationId}
      AND kc."embedding" IS NOT NULL
      AND kd."status" = 'READY'
    ORDER BY kc."embedding" <=> ${vector}::vector
    LIMIT ${limit}
  `;
}
