import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { JobQueue, JobStatus, JobType, JobPriority } from '../entities/job-queue.entity';

/**
 * Job Queue Repository
 *
 * Custom repository methods for job queue queries.
 */
@Injectable()
export class JobQueueRepository extends Repository<JobQueue> {
  constructor(private dataSource: DataSource) {
    super(JobQueue, dataSource.createEntityManager());
  }

  /**
   * Find job by ID
   */
  async findById(id: number, includeExecutions = false): Promise<JobQueue | null> {
    const query = this.createQueryBuilder('job').where('job.id = :id', { id });

    if (includeExecutions) {
      query.leftJoinAndSelect('job.executions', 'executions');
    }

    return query.getOne();
  }

  /**
   * Find jobs by status
   */
  async findByStatus(status: JobStatus, organizationId?: number): Promise<JobQueue[]> {
    const query = this.createQueryBuilder('job')
      .where('job.status = :status', { status })
      .orderBy('job.priority', 'DESC')
      .addOrderBy('job.scheduledAt', 'ASC')
      .addOrderBy('job.createdAt', 'ASC');

    if (organizationId) {
      query.andWhere('job.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find pending jobs
   */
  async findPendingJobs(organizationId?: number, beforeDate?: Date): Promise<JobQueue[]> {
    const executionDate = beforeDate || new Date();
    const query = this.createQueryBuilder('job')
      .where('job.status = :status', { status: JobStatus.PENDING })
      .andWhere('(job.scheduledAt IS NULL OR job.scheduledAt <= :executionDate)', { executionDate })
      .orderBy('job.priority', 'DESC')
      .addOrderBy('job.scheduledAt', 'ASC')
      .addOrderBy('job.createdAt', 'ASC');

    if (organizationId) {
      query.andWhere('job.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find jobs by type
   */
  async findByType(jobType: JobType, organizationId?: number): Promise<JobQueue[]> {
    const query = this.createQueryBuilder('job')
      .where('job.jobType = :jobType', { jobType })
      .orderBy('job.priority', 'DESC')
      .addOrderBy('job.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('job.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find recurring jobs
   */
  async findRecurringJobs(organizationId?: number): Promise<JobQueue[]> {
    const query = this.createQueryBuilder('job')
      .where('job.isRecurring = :isRecurring', { isRecurring: true })
      .andWhere('job.status != :cancelled', { cancelled: JobStatus.CANCELLED })
      .orderBy('job.nextExecutionAt', 'ASC');

    if (organizationId) {
      query.andWhere('job.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find jobs due for execution
   */
  async findJobsDueForExecution(beforeDate?: Date, organizationId?: number): Promise<JobQueue[]> {
    const executionDate = beforeDate || new Date();
    const query = this.createQueryBuilder('job')
      .where('job.status = :status', { status: JobStatus.PENDING })
      .andWhere('(job.scheduledAt IS NULL OR job.scheduledAt <= :executionDate)', { executionDate })
      .orderBy('job.priority', 'DESC')
      .addOrderBy('job.scheduledAt', 'ASC');

    if (organizationId) {
      query.andWhere('job.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find jobs by priority
   */
  async findByPriority(priority: JobPriority, organizationId?: number): Promise<JobQueue[]> {
    const query = this.createQueryBuilder('job')
      .where('job.priority = :priority', { priority })
      .andWhere('job.status = :status', { status: JobStatus.PENDING })
      .orderBy('job.scheduledAt', 'ASC')
      .addOrderBy('job.createdAt', 'ASC');

    if (organizationId) {
      query.andWhere('job.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find failed jobs that can be retried
   */
  async findRetryableJobs(organizationId?: number): Promise<JobQueue[]> {
    const query = this.createQueryBuilder('job')
      .where('job.status = :status', { status: JobStatus.FAILED })
      .andWhere('job.retryCount < job.maxRetries')
      .orderBy('job.updatedAt', 'ASC');

    if (organizationId) {
      query.andWhere('job.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
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
    const query = this.createQueryBuilder('job')
      .orderBy('job.priority', 'DESC')
      .addOrderBy('job.createdAt', 'DESC');

    if (searchTerm) {
      query.andWhere(
        `(
          job.jobName ILIKE :searchTerm OR
          job.jobDescription ILIKE :searchTerm
        )`,
        { searchTerm: `%${searchTerm}%` },
      );
    }

    if (jobType) {
      query.andWhere('job.jobType = :jobType', { jobType });
    }

    if (status) {
      query.andWhere('job.status = :status', { status });
    }

    if (priority) {
      query.andWhere('job.priority = :priority', { priority });
    }

    if (organizationId) {
      query.andWhere('job.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }
}

