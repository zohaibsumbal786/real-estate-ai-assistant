import type { Queue } from "bullmq";
import { config } from "../config.js";

let knowledgeQueueInstance: Queue | null = null;

async function getKnowledgeQueue() {
  if (knowledgeQueueInstance) {
    return knowledgeQueueInstance;
  }

  const { Queue } = await import("bullmq");
  const { redisConnectionOptions } = await import("./redis.js");
  knowledgeQueueInstance = new Queue("knowledge-document-processing", {
    connection: redisConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000
      },
      removeOnComplete: {
        age: 3600 // Remove completed jobs after 1 hour
      },
      removeOnFail: false // Keep failed jobs for debugging
    }
  });
  return knowledgeQueueInstance;
}

export type KnowledgeDocumentJob = {
  documentId: string;
};

export async function enqueueKnowledgeDocument(documentId: string) {
  if (config.REDIS_OPTIONAL) {
    try {
      const queue = await getKnowledgeQueue();
      await queue.add(
        "process-upload",
        { documentId },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 200 }
        }
      );
      return;
    } catch (error) {
      console.warn("[Knowledge queue] Redis unavailable, processing inline:", error);
      const { processQueuedKnowledgeDocument } = await import("../services/knowledge-service.js");
      void processQueuedKnowledgeDocument(documentId).catch((inlineError) => {
        console.error("[Knowledge queue] Inline processing failed:", inlineError);
      });
      return;
    }
  }

  const queue = await getKnowledgeQueue();
  return queue.add(
    "process-upload",
    { documentId },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 }
    }
  );
}
