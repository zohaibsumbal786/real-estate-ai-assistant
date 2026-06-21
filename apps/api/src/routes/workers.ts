/**
 * Worker health check endpoint
 * Provides metrics on worker status and performance
 */

import { Router } from "express";
import { workerHealthMonitor } from "../services/worker-health.js";

export const workersRouter = Router();

/**
 * GET /api/workers/health
 * Returns health status of all workers
 */
workersRouter.get("/health", (_req, res) => {
  const health = workerHealthMonitor.getHealthStatus();
  
  res.status(health.isHealthy ? 200 : 503).json({
    success: health.isHealthy,
    code: health.isHealthy ? "WORKERS_HEALTHY" : "WORKERS_UNHEALTHY",
    message: health.isHealthy 
      ? "All workers are healthy"
      : `${health.failedWorkers.length} worker(s) unhealthy`,
    data: {
      isHealthy: health.isHealthy,
      workers: health.workers.map(w => ({
        name: w.name,
        totalProcessed: w.totalProcessed,
        totalFailed: w.totalFailed,
        failureRate: `${(w.failureRate * 100).toFixed(2)}%`,
        isHealthy: w.isHealthy,
        activeJobs: w.activeJobs,
        lastChecked: w.lastChecked,
        recentFailures: w.failedJobs.slice(-5) // Last 5 failures
      })),
      failedWorkers: health.failedWorkers
    }
  });
});

/**
 * GET /api/workers/metrics
 * Returns detailed metrics for all workers
 */
workersRouter.get("/metrics", (_req, res) => {
  const metrics = workerHealthMonitor.getAllMetrics();
  
  res.json({
    success: true,
    code: "WORKER_METRICS",
    data: metrics.map(m => ({
      name: m.name,
      totalProcessed: m.totalProcessed,
      totalFailed: m.totalFailed,
      failureRate: `${(m.failureRate * 100).toFixed(2)}%`,
      isHealthy: m.isHealthy,
      activeJobs: m.activeJobs,
      lastChecked: m.lastChecked,
      recentFailures: m.failedJobs
    }))
  });
});

/**
 * GET /api/workers/:name/metrics
 * Returns metrics for a specific worker
 */
workersRouter.get("/:name/metrics", (req, res) => {
  const workerName = req.params.name;
  const metrics = workerHealthMonitor.getMetrics(workerName);
  
  if (!metrics) {
    return res.status(404).json({
      success: false,
      code: "WORKER_NOT_FOUND",
      message: `Worker "${workerName}" not found`
    });
  }
  
  res.json({
    success: true,
    code: "WORKER_METRICS",
    data: {
      name: metrics.name,
      totalProcessed: metrics.totalProcessed,
      totalFailed: metrics.totalFailed,
      failureRate: `${(metrics.failureRate * 100).toFixed(2)}%`,
      isHealthy: metrics.isHealthy,
      activeJobs: metrics.activeJobs,
      lastChecked: metrics.lastChecked,
      recentFailures: metrics.failedJobs
    }
  });
});

/**
 * POST /api/workers/:name/reset
 * Reset metrics for a specific worker
 */
workersRouter.post("/:name/reset", (req, res) => {
  const workerName = req.params.name;
  const metrics = workerHealthMonitor.getMetrics(workerName);
  
  if (!metrics) {
    return res.status(404).json({
      success: false,
      code: "WORKER_NOT_FOUND",
      message: `Worker "${workerName}" not found`
    });
  }
  
  workerHealthMonitor.reset(workerName);
  
  res.json({
    success: true,
    code: "WORKER_RESET",
    message: `Metrics for worker "${workerName}" have been reset`
  });
});
