import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { In } from 'typeorm';
import { JobQueueRepository } from '../repositories/job-queue.repository';
import { JobExecutionRepository } from '../repositories/job-execution.repository';
import {
  JobQueue,
  JobStatus,
  JobType,
} from '../entities/job-queue.entity';
import {
  JobExecution,
  ExecutionStatus,
} from '../entities/job-execution.entity';
import { EmailJobProcessor } from '../processors/email-job.processor';
import { ReportJobProcessor } from '../processors/report-job.processor';
import { ExportJobProcessor } from '../processors/export-job.processor';
import { ImportJobProcessor } from '../processors/import-job.processor';
import { NotificationJobProcessor } from '../processors/notification-job.processor';
import { WebhookJobProcessor } from '../processors/webhook-job.processor';
import { CalculationJobProcessor } from '../processors/calculation-job.processor';
import { CleanupJobProcessor } from '../processors/cleanup-job.processor';

/**
 * Job Processor Service
 * 
 * Processes jobs with:
 * - Job execution
 * - Retry logic
 * - Timeout handling
 * - Error handling
 * - Execution logging
 */
@Injectable()
export class JobProcessorService {
  private readonly logger = new Logger(JobProcessorService.name);
  private readonly processors: Map<JobType, any> = new Map();

  constructor(
    private readonly jobQueueRepository: JobQueueRepository,
    private readonly jobExecutionRepository: JobExecutionRepository,
    private readonly emailJobProcessor: EmailJobProcessor,
    private readonly reportJobProcessor: ReportJobProcessor,
    private readonly exportJobProcessor: ExportJobProcessor,
    private readonly importJobProcessor: ImportJobProcessor,
    private readonly notificationJobProcessor: NotificationJobProcessor,
    private readonly webhookJobProcessor: WebhookJobProcessor,
    private readonly calculationJobProcessor: CalculationJobProcessor,
    private readonly cleanupJobProcessor: CleanupJobProcessor,
  ) {
    // Register processors
    this.processors.set(JobType.EMAIL, emailJobProcessor);
    this.processors.set(JobType.REPORT, reportJobProcessor);
    this.processors.set(JobType.EXPORT, exportJobProcessor);
    this.processors.set(JobType.IMPORT, importJobProcessor);
    this.processors.set(JobType.NOTIFICATION, notificationJobProcessor);
    this.processors.set(JobType.WEBHOOK, webhookJobProcessor);
    this.processors.set(JobType.CALCULATION, calculationJobProcessor);
    this.processors.set(JobType.CLEANUP, cleanupJobProcessor);
  }

  /**
   * Process a job
   */
  async processJob(jobId: number, workerId?: string): Promise<JobExecution> {
    const job = await this.jobQueueRepository.findById(jobId);

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Check if job is ready to be processed
    if (job.status !== JobStatus.PENDING && job.status !== JobStatus.RETRYING) {
      throw new Error(`Job ${jobId} is not in a processable state: ${job.status}`);
    }

    // Check dependencies
    if (job.dependencies && job.dependencies.length > 0) {
      const dependencyStatuses = await this.checkDependencies(job.dependencies);
      if (!dependencyStatuses.allCompleted) {
        this.logger.warn(
          `Job ${jobId} has incomplete dependencies, skipping execution`,
        );
        return null;
      }
    }

    // Create execution record
    const execution = this.jobExecutionRepository.create({
      jobQueueId: job.id,
      status: ExecutionStatus.STARTED,
      startedAt: new Date(),
      workerId: workerId || `worker-${process.pid}`,
    });

    const savedExecution = await this.jobExecutionRepository.save(execution);

    // Update job status
    job.status = JobStatus.RUNNING;
    job.lastExecutionAt = new Date();
    await this.jobQueueRepository.save(job);

    try {
      // Get processor for job type
      const processor = this.processors.get(job.jobType);

      if (!processor) {
        throw new Error(`No processor found for job type: ${job.jobType}`);
      }

      // Set timeout if specified
      let timeoutHandle: NodeJS.Timeout | null = null;
      const timeoutPromise = job.timeout
        ? new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => {
              reject(new Error(`Job ${jobId} timed out after ${job.timeout} seconds`));
            }, job.timeout * 1000);
          })
        : null;

      // Execute job
      const startTime = Date.now();
      const result = await Promise.race([
        processor.process(job.jobData, job),
        timeoutPromise,
      ] as Promise<any>[]);

      // Clear timeout if job completed
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      const durationMs = Date.now() - startTime;

      // Update execution with success
      savedExecution.status = ExecutionStatus.COMPLETED;
      savedExecution.completedAt = new Date();
      savedExecution.durationMs = durationMs;
      savedExecution.result = result;

      await this.jobExecutionRepository.save(savedExecution);

      // Update job status
      if (job.isRecurring) {
        // Schedule next execution for recurring jobs
        job.status = JobStatus.PENDING;
        job.nextExecutionAt = this.calculateNextExecution(job);
      } else {
        job.status = JobStatus.COMPLETED;
      }

      await this.jobQueueRepository.save(job);

      this.logger.log(`Job ${jobId} completed successfully in ${durationMs}ms`);

      return savedExecution;
    } catch (error) {
      const durationMs = Date.now() - savedExecution.startedAt.getTime();

      // Update execution with failure
      savedExecution.status =
        error.message?.includes('timed out') || job.timeout
          ? ExecutionStatus.TIMEOUT
          : ExecutionStatus.FAILED;
      savedExecution.completedAt = new Date();
      savedExecution.durationMs = durationMs;
      savedExecution.errorMessage = error.message;
      savedExecution.errorStack = error.stack;

      await this.jobExecutionRepository.save(savedExecution);

      // Handle retry logic
      if (job.retryCount < job.maxRetries) {
        job.status = JobStatus.RETRYING;
        job.retryCount += 1;
        job.scheduledAt = new Date(
          Date.now() + job.retryDelay * 1000 * job.retryCount,
        ); // Exponential backoff

        this.logger.warn(
          `Job ${jobId} failed, will retry (${job.retryCount}/${job.maxRetries})`,
        );
      } else {
        job.status = JobStatus.FAILED;
        this.logger.error(`Job ${jobId} failed after ${job.maxRetries} retries`);
      }

      await this.jobQueueRepository.save(job);

      return savedExecution;
    }
  }

  /**
   * Check if job dependencies are completed
   */
  private async checkDependencies(
    dependencyIds: number[],
  ): Promise<{ allCompleted: boolean; completed: number[]; pending: number[] }> {
    const dependencies = await this.jobQueueRepository.find({
      where: { id: In(dependencyIds) },
    });

    const completed: number[] = [];
    const pending: number[] = [];

    dependencies.forEach((dep) => {
      if (dep.status === JobStatus.COMPLETED) {
        completed.push(dep.id);
      } else {
        pending.push(dep.id);
      }
    });

    return {
      allCompleted: pending.length === 0,
      completed,
      pending,
    };
  }

  /**
   * Calculate next execution time for recurring job
   */
  private calculateNextExecution(job: JobQueue): Date {
    if (!job.cronExpression) {
      // Simple interval-based calculation
      const interval = job.retryDelay || 3600; // Default 1 hour
      return new Date(Date.now() + interval * 1000);
    }

    // For cron expressions, you would use a cron parser library
    // For now, return a simple calculation
    // In production, use a library like node-cron or cron-parser
    return new Date(Date.now() + 3600 * 1000); // Default: 1 hour
  }
}
