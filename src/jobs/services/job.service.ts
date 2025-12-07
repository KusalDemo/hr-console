import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JobQueueRepository } from '../repositories/job-queue.repository';
import { JobExecutionRepository } from '../repositories/job-execution.repository';
import { JobProcessorService } from './job-processor.service';
import {
  JobQueue,
  JobStatus,
  JobType,
  JobPriority,
} from '../entities/job-queue.entity';
import { JobExecution } from '../entities/job-execution.entity';

/**
 * Job Service
 * 
 * Manages jobs with:
 * - Job CRUD operations
 * - Job scheduling
 * - Job monitoring
 * - Job cancellation
 * - Recurring jobs
 */
@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    private readonly jobQueueRepository: JobQueueRepository,
    private readonly jobExecutionRepository: JobExecutionRepository,
    private readonly jobProcessorService: JobProcessorService,
  ) {}

  /**
   * Create a new job
   */
  async createJob(createDto: any, createdBy?: number): Promise<JobQueue> {
    const job = this.jobQueueRepository.create({
      ...createDto,
      status: JobStatus.PENDING,
      priority: createDto.priority || JobPriority.NORMAL,
      maxRetries: createDto.maxRetries || 3,
      retryCount: 0,
      retryDelay: createDto.retryDelay || 60,
      isRecurring: createDto.isRecurring || false,
      createdBy,
    });

    // Calculate next execution for recurring jobs
    if (job.isRecurring && job.cronExpression) {
      job.nextExecutionAt = this.calculateNextExecution(job);
    }

    const saved = await this.jobQueueRepository.save(job);

    this.logger.log(`Created job: ${saved.id} (${saved.jobName})`);

    return saved;
  }

  /**
   * Get job by ID
   */
  async getJobById(
    id: number,
    includeExecutions = false,
  ): Promise<JobQueue> {
    const job = await this.jobQueueRepository.findById(id, includeExecutions);

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }

  /**
   * Update job
   */
  async updateJob(
    id: number,
    updateDto: any,
    updatedBy?: number,
  ): Promise<JobQueue> {
    const job = await this.jobQueueRepository.findById(id);

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    // Don't allow updating running jobs
    if (job.status === JobStatus.RUNNING) {
      throw new BadRequestException('Cannot update a running job');
    }

    Object.assign(job, {
      ...updateDto,
      updatedBy,
    });

    // Recalculate next execution if recurring job config changed
    if (job.isRecurring && (updateDto.cronExpression || updateDto.retryDelay)) {
      job.nextExecutionAt = this.calculateNextExecution(job);
    }

    const saved = await this.jobQueueRepository.save(job);

    this.logger.log(`Updated job: ${saved.id} (${saved.jobName})`);

    return saved;
  }

  /**
   * Cancel job
   */
  async cancelJob(id: number): Promise<JobQueue> {
    const job = await this.jobQueueRepository.findById(id);

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.CANCELLED) {
      throw new BadRequestException(`Job is already ${job.status}`);
    }

    job.status = JobStatus.CANCELLED;
    const saved = await this.jobQueueRepository.save(job);

    this.logger.log(`Cancelled job: ${saved.id}`);

    return saved;
  }

  /**
   * Execute job immediately
   */
  async executeJob(id: number, workerId?: string): Promise<JobExecution> {
    return this.jobProcessorService.processJob(id, workerId);
  }

  /**
   * Retry failed job
   */
  async retryJob(id: number): Promise<JobQueue> {
    const job = await this.jobQueueRepository.findById(id);

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    if (job.status !== JobStatus.FAILED) {
      throw new BadRequestException('Job is not in failed state');
    }

    if (job.retryCount >= job.maxRetries) {
      throw new BadRequestException('Job has exceeded maximum retry attempts');
    }

    job.status = JobStatus.RETRYING;
    job.retryCount += 1;
    job.scheduledAt = new Date(
      Date.now() + job.retryDelay * 1000 * job.retryCount,
    );

    const saved = await this.jobQueueRepository.save(job);

    this.logger.log(`Retrying job: ${saved.id} (attempt ${saved.retryCount})`);

    return saved;
  }

  /**
   * Get jobs by status
   */
  async getJobsByStatus(
    status: JobStatus,
    organizationId?: number,
  ): Promise<JobQueue[]> {
    return this.jobQueueRepository.findByStatus(status, organizationId);
  }

  /**
   * Get pending jobs
   */
  async getPendingJobs(
    organizationId?: number,
    beforeDate?: Date,
  ): Promise<JobQueue[]> {
    return this.jobQueueRepository.findPendingJobs(organizationId, beforeDate);
  }

  /**
   * Get jobs due for execution
   */
  async getJobsDueForExecution(
    beforeDate?: Date,
    organizationId?: number,
  ): Promise<JobQueue[]> {
    return this.jobQueueRepository.findJobsDueForExecution(beforeDate, organizationId);
  }

  /**
   * Get retryable jobs
   */
  async getRetryableJobs(organizationId?: number): Promise<JobQueue[]> {
    return this.jobQueueRepository.findRetryableJobs(organizationId);
  }

  /**
   * Get job executions
   */
  async getJobExecutions(
    jobId: number,
    limit?: number,
  ): Promise<JobExecution[]> {
    const job = await this.jobQueueRepository.findById(jobId);

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    return this.jobExecutionRepository.findByJobQueue(jobId, limit);
  }

  /**
   * Get job execution statistics
   */
  async getJobStatistics(
    jobId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const job = await this.jobQueueRepository.findById(jobId);

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const statistics = await this.jobExecutionRepository.getStatistics(
      jobId,
      startDate,
      endDate,
    );

    return {
      jobId: job.id,
      jobName: job.jobName,
      ...statistics,
    };
  }

  /**
   * Search jobs
   */
  async searchJobs(
    searchTerm?: string,
    jobType?: JobType,
    status?: JobStatus,
    priority?: JobPriority,
    organizationId?: number,
  ): Promise<JobQueue[]> {
    return this.jobQueueRepository.searchJobs(
      searchTerm,
      jobType,
      status,
      priority,
      organizationId,
    );
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
