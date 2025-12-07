import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobService } from './job.service';
import { JobProcessorService } from './job-processor.service';
import { JobStatus } from '../entities/job-queue.entity';

/**
 * Job Scheduler Service
 *
 * Scheduled job processing:
 * - Processes pending jobs periodically
 * - Handles recurring jobs
 * - Retries failed jobs
 */
@Injectable()
export class JobSchedulerService {
  private readonly logger = new Logger(JobSchedulerService.name);
  private isProcessing = false;

  constructor(
    private readonly jobService: JobService,
    private readonly jobProcessorService: JobProcessorService,
  ) {}

  /**
   * Process pending jobs every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingJobs() {
    if (this.isProcessing) {
      this.logger.debug('Job processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      // Get jobs due for execution
      const dueJobs = await this.jobService.getJobsDueForExecution();

      this.logger.debug(`Found ${dueJobs.length} jobs due for execution`);

      // Process jobs (limit to 10 at a time to avoid overload)
      const jobsToProcess = dueJobs.slice(0, 10);

      for (const job of jobsToProcess) {
        try {
          await this.jobProcessorService.processJob(job.id);
        } catch (error) {
          this.logger.error(`Error processing job ${job.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error in job scheduler: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process retryable jobs every 5 minutes
   */
  @Cron('*/5 * * * *')
  async processRetryableJobs() {
    try {
      const retryableJobs = await this.jobService.getRetryableJobs();

      this.logger.debug(`Found ${retryableJobs.length} retryable jobs`);

      for (const job of retryableJobs) {
        try {
          // Check if retry delay has passed
          if (job.scheduledAt && job.scheduledAt <= new Date()) {
            await this.jobProcessorService.processJob(job.id);
          }
        } catch (error) {
          this.logger.error(`Error retrying job ${job.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error in retry job scheduler: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process recurring jobs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processRecurringJobs() {
    try {
      // This would check for recurring jobs and create new job instances
      // For now, this is a placeholder
      this.logger.debug('Processing recurring jobs');
    } catch (error) {
      this.logger.error(`Error in recurring job scheduler: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
