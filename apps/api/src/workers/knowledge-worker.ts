import { Worker } from "bullmq";
import { prisma } from "@dubai-ai/db";
import { redisConnectionOptions } from "../queues/redis.js";
import type { KnowledgeDocumentJob } from "../queues/knowledge.queue.js";
import { processQueuedKnowledgeDocument } from "../services/knowledge-service.js";
import { workerHealthMonitor } from "../services/worker-health.js";

const WORKER_NAME = "knowledge-document-processing";
workerHealthMonitor.registerWorker(WORKER_NAME);

const worker = new Worker<KnowledgeDocumentJob>(
  "knowledge-document-processing",
  async (job) => {
    console.log("[Knowledge worker] processing document", {
      jobId: job.id,
      documentId: job.data.documentId,
      attempt: job.attemptsMade + 1
    });

    try {
      const startTime = Date.now();
      const document = await processQueuedKnowledgeDocument(job.data.documentId);
      const duration = Date.now() - startTime;

      console.log("[Knowledge worker] document processed successfully", {
        documentId: document.id,
        chunks: document.chunks.length,
        duration: `${duration}ms`
      });

      return { documentId: document.id, chunks: document.chunks.length, duration };
    } catch (error) {
      console.error("[Knowledge worker] processing failed", {
        jobId: job.id,
        documentId: job.data.documentId,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      // Record job failure in health monitor
      await workerHealthMonitor.recordJobFailure(
        WORKER_NAME,
        job.id || "unknown",
        error instanceof Error ? error.message : String(error)
      );

      throw error;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 2
  }
);


worker.on("failed", (job, error) => {
  console.error("[Knowledge worker] job failed permanently", {
    jobId: job?.id,
    documentId: job?.data?.documentId,
    attempts: job?.attemptsMade,
    error: error?.message,
    timestamp: new Date().toISOString()
  });
  
  if (job) {
    workerHealthMonitor.recordJobFailure(
      WORKER_NAME,
      job.id || "unknown",
      error?.message || "Unknown error"
    );
  }
});

worker.on("completed", (job) => {
  console.log("[Knowledge worker] job completed", {
    jobId: job.id,
    documentId: job.data.documentId,
    timestamp: new Date().toISOString()
  });
  
  workerHealthMonitor.recordJobCompletion(WORKER_NAME);
});

worker.on("active", (job) => {
  console.log("[Knowledge worker] job started", {
    jobId: job.id,
    documentId: job.data.documentId
  });
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function shutdown() {
  console.log("[Knowledge worker] shutting down gracefully...");
  await worker.close();
  await prisma.$disconnect();
  console.log("[Knowledge worker] shutdown complete");
  process.exit(0);
}

console.log("[Knowledge worker] listening for document embedding jobs");
