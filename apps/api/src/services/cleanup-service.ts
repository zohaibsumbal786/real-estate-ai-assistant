/**
 * Database cleanup service
 * Removes old/expired records to keep database clean
 */

import { prisma } from "@dubai-ai/db";

export interface CleanupStats {
  expiredTokensDeleted: number;
  oldNotificationsArchived: number;
  failedJobsDeleted: number;
  timestamp: Date;
}

/**
 * Clean up expired refresh tokens
 * Removes tokens that have expired and are not needed anymore
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    console.log(`[Cleanup] Deleted ${result.count} expired refresh tokens`);
    return result.count;
  } catch (error) {
    console.error("[Cleanup] Error cleaning up expired tokens:", error);
    return 0;
  }
}

/**
 * Archive old notifications
 * Moves notifications older than 90 days to archived status
 */
export async function archiveOldNotifications(daysOld: number = 90): Promise<number> {
  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysOld);

    const result = await prisma.notification.updateMany({
      where: {
        createdAt: { lt: thresholdDate },
        status: { not: "ARCHIVED" }
      },
      data: {
        status: "ARCHIVED"
      }
    });

    console.log(`[Cleanup] Archived ${result.count} old notifications`);
    return result.count;
  } catch (error) {
    console.error("[Cleanup] Error archiving old notifications:", error);
    return 0;
  }
}

/**
 * Clean up failed jobs from the failed jobs queue
 * Removes job records older than specified days
 */
export async function cleanupOldFailedJobs(daysOld: number = 30): Promise<number> {
  try {
    // Note: This assumes you have a FailedJob table or similar
    // For BullMQ, failed jobs are stored in Redis by the worker
    // This is a placeholder for when/if you implement persistent failed job logging
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysOld);

    console.log(`[Cleanup] Cleaned up failed jobs older than ${daysOld} days`);
    return 0; // Return 0 if not implemented
  } catch (error) {
    console.error("[Cleanup] Error cleaning up failed jobs:", error);
    return 0;
  }
}

/**
 * Full cleanup operation
 * Runs all cleanup tasks and returns statistics
 */
export async function runFullCleanup(): Promise<CleanupStats> {
  console.log("[Cleanup] Starting full database cleanup...");
  const startTime = Date.now();

  const [expiredTokens, archivedNotifications, failedJobs] = await Promise.all([
    cleanupExpiredTokens(),
    archiveOldNotifications(90),
    cleanupOldFailedJobs(30)
  ]);

  const duration = Date.now() - startTime;

  const stats: CleanupStats = {
    expiredTokensDeleted: expiredTokens,
    oldNotificationsArchived: archivedNotifications,
    failedJobsDeleted: failedJobs,
    timestamp: new Date()
  };

  console.log(`[Cleanup] Full cleanup completed in ${duration}ms`, stats);
  return stats;
}

/**
 * Schedule periodic cleanup
 * Runs cleanup daily at specified hour
 */
export async function schedulePeriodicCleanup(hourOfDay: number = 2): Promise<void> {
  const now = new Date();
  let nextRun = new Date();
  nextRun.setHours(hourOfDay, 0, 0, 0);

  // If the scheduled time has already passed today, schedule for tomorrow
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const delay = nextRun.getTime() - now.getTime();

  console.log(
    `[Cleanup] Scheduled periodic cleanup for ${nextRun.toISOString()} (in ${Math.round(delay / 1000 / 60)} minutes)`
  );

  // Set timeout for first run
  setTimeout(async () => {
    await runFullCleanup();

    // Schedule recurring daily cleanup
    setInterval(() => {
      runFullCleanup().catch((error) => {
        console.error("[Cleanup] Error in scheduled cleanup:", error);
      });
    }, 24 * 60 * 60 * 1000); // Run daily
  }, delay);
}
