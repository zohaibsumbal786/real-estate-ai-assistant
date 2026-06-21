import { Worker } from "bullmq";
import { prisma } from "@dubai-ai/db";
import { remindersQueue, scheduleAppointmentReminderScanner } from "../queues/reminders.queue.js";
import { redisConnectionOptions } from "../queues/redis.js";
import { sendDueAppointmentReminders } from "../services/reminder-service.js";
import { workerHealthMonitor } from "../services/worker-health.js";

const WORKER_NAME = "appointment-reminders";
workerHealthMonitor.registerWorker(WORKER_NAME);

await scheduleAppointmentReminderScanner();

const worker = new Worker(
  "appointment-reminders",
  async (job) => {
    console.log("[Reminder worker] processing job", {
      jobId: job.id,
      attempt: job.attemptsMade + 1
    });

    try {
      const startTime = Date.now();
      const reminders = await sendDueAppointmentReminders();
      const duration = Date.now() - startTime;

      if (reminders.length > 0) {
        console.log("[Reminder worker] reminders sent successfully", {
          count: reminders.length,
          duration: `${duration}ms`,
          jobId: job.id
        });
      } else {
        console.log("[Reminder worker] no reminders to send", {
          duration: `${duration}ms`,
          jobId: job.id
        });
      }

      return { sent: reminders.length, duration };
    } catch (error) {
      console.error("[Reminder worker] processing failed", {
        jobId: job.id,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 1
  }
);

worker.on("failed", (job, error) => {
  console.error("[Reminder worker] job failed permanently", {
    jobId: job?.id,
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
  console.log("[Reminder worker] job completed", {
    jobId: job.id,
    timestamp: new Date().toISOString()
  });
  
  workerHealthMonitor.recordJobCompletion(WORKER_NAME);
});

worker.on("active", (job) => {
  console.log("[Reminder worker] job started", {
    jobId: job.id
  });
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function shutdown() {
  console.log("[Reminder worker] shutting down gracefully...");
  await worker.close();
  await remindersQueue.close();
  await prisma.$disconnect();
  console.log("[Reminder worker] shutdown complete");
  process.exit(0);
}

console.log("[Reminder worker] scheduled recurring appointment reminder scan");
