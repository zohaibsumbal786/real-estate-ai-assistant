/**
 * Worker health monitoring service
 * Tracks worker metrics and health status
 */

interface WorkerMetrics {
  name: string;
  totalProcessed: number;
  totalFailed: number;
  failureRate: number; // percentage
  isHealthy: boolean;
  lastChecked: Date;
  activeJobs: number;
  failedJobs: Array<{
    jobId: string;
    error: string;
    timestamp: Date;
  }>;
}

class WorkerHealthMonitor {
  private metrics = new Map<string, WorkerMetrics>();
  private failureThreshold = 0.1; // 10% failure rate threshold

  registerWorker(name: string) {
    this.metrics.set(name, {
      name,
      totalProcessed: 0,
      totalFailed: 0,
      failureRate: 0,
      isHealthy: true,
      lastChecked: new Date(),
      activeJobs: 0,
      failedJobs: []
    });
  }

  recordJobCompletion(workerName: string) {
    const metrics = this.metrics.get(workerName);
    if (metrics) {
      metrics.totalProcessed++;
      this.updateHealthStatus(workerName);
    }
  }

  recordJobFailure(workerName: string, jobId: string, error: string) {
    const metrics = this.metrics.get(workerName);
    if (metrics) {
      metrics.totalFailed++;
      metrics.failedJobs.push({
        jobId,
        error,
        timestamp: new Date()
      });

      // Keep only last 10 failed jobs
      if (metrics.failedJobs.length > 10) {
        metrics.failedJobs.shift();
      }

      this.updateHealthStatus(workerName);
    }
  }

  setActiveJobs(workerName: string, count: number) {
    const metrics = this.metrics.get(workerName);
    if (metrics) {
      metrics.activeJobs = count;
    }
  }

  private updateHealthStatus(workerName: string) {
    const metrics = this.metrics.get(workerName);
    if (metrics) {
      const total = metrics.totalProcessed + metrics.totalFailed;
      metrics.failureRate = total > 0 ? metrics.totalFailed / total : 0;
      metrics.isHealthy = metrics.failureRate < this.failureThreshold;
      metrics.lastChecked = new Date();
    }
  }

  getMetrics(workerName: string): WorkerMetrics | undefined {
    return this.metrics.get(workerName);
  }

  getAllMetrics(): WorkerMetrics[] {
    return Array.from(this.metrics.values());
  }

  getHealthStatus(): {
    isHealthy: boolean;
    workers: WorkerMetrics[];
    failedWorkers: string[];
  } {
    const allMetrics = this.getAllMetrics();
    const failedWorkers = allMetrics
      .filter(m => !m.isHealthy)
      .map(m => m.name);

    return {
      isHealthy: failedWorkers.length === 0,
      workers: allMetrics,
      failedWorkers
    };
  }

  reset(workerName: string) {
    const metrics = this.metrics.get(workerName);
    if (metrics) {
      metrics.totalProcessed = 0;
      metrics.totalFailed = 0;
      metrics.failureRate = 0;
      metrics.isHealthy = true;
      metrics.failedJobs = [];
      metrics.lastChecked = new Date();
    }
  }
}

export const workerHealthMonitor = new WorkerHealthMonitor();
