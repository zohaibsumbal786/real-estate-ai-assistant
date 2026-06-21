import { Queue } from "bullmq";
import { redisConnectionOptions } from "./redis.js";

export const remindersQueue = new Queue("appointment-reminders", {
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

export async function scheduleAppointmentReminderScanner() {
  await remindersQueue.add(
    "scan-appointment-reminders",
    {},
    {
      jobId: "scan-appointment-reminders",
      repeat: { pattern: "* * * * *" },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 }
    }
  );
}
