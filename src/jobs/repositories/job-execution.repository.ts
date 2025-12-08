import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { JobExecution, ExecutionStatus } from '../entities/job-execution.entity';

/**
 * Job Execution Repository
 *
 * Custom repository methods for job execution queries.
 */
@Injectable()
export class JobExecutionRepository extends Repository<JobExecution> {
  constructor(private dataSource: DataSource) {
    super(JobExecution, dataSource.createEntityManager());
  }

  /**
   * Find execution by ID
   */
  async findById(id: number): Promise<JobExecution | null> {
    return this.createQueryBuilder('execution')
      .leftJoinAndSelect('execution.jobQueue', 'job')
      .where('execution.id = :id', { id })
      .getOne();
  }

  /**
   * Find executions by job queue
   */
  async findByJobQueue(jobQueueId: number, limit?: number): Promise<JobExecution[]> {
    const query = this.createQueryBuilder('execution')
      .where('execution.jobQueueId = :jobQueueId', { jobQueueId })
      .orderBy('execution.startedAt', 'DESC');

    if (limit) {
      query.limit(limit);
    }

    return query.getMany();
  }

  /**
   * Find executions by status
   */
  async findByStatus(status: ExecutionStatus, jobQueueId?: number): Promise<JobExecution[]> {
    const query = this.createQueryBuilder('execution')
      .where('execution.status = :status', { status })
      .orderBy('execution.startedAt', 'DESC');

    if (jobQueueId) {
      query.andWhere('execution.jobQueueId = :jobQueueId', { jobQueueId });
    }

    return query.getMany();
  }

  /**
   * Find failed executions
   */
  async findFailedExecutions(
    jobQueueId?: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<JobExecution[]> {
    const query = this.createQueryBuilder('execution')
      .where('execution.status = :status', { status: ExecutionStatus.FAILED })
      .orderBy('execution.startedAt', 'DESC');

    if (jobQueueId) {
      query.andWhere('execution.jobQueueId = :jobQueueId', { jobQueueId });
    }

    if (startDate) {
      query.andWhere('execution.startedAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('execution.startedAt <= :endDate', { endDate });
    }

    return query.getMany();
  }

  /**
   * Get execution statistics
   */
  async getStatistics(
    jobQueueId?: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    averageDuration: number;
    successRate: number;
  }> {
    const query = this.createQueryBuilder('execution');

    if (jobQueueId) {
      query.where('execution.jobQueueId = :jobQueueId', { jobQueueId });
    }

    if (startDate) {
      query.andWhere('execution.startedAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('execution.startedAt <= :endDate', { endDate });
    }

    const executions = await query.getMany();

    const statistics = {
      total: executions.length,
      byStatus: {} as Record<string, number>,
      averageDuration: 0,
      successRate: 0,
    };

    let totalDuration = 0;
    let completedCount = 0;

    executions.forEach((execution) => {
      // Count by status
      statistics.byStatus[execution.status] = (statistics.byStatus[execution.status] || 0) + 1;

      // Calculate average duration
      if (execution.durationMs) {
        totalDuration += execution.durationMs;
      }

      // Count successful executions
      if (execution.status === ExecutionStatus.COMPLETED) {
        completedCount++;
      }
    });

    if (executions.length > 0) {
      statistics.averageDuration = totalDuration / executions.length;
      statistics.successRate = (completedCount / executions.length) * 100;
    }

    return statistics;
  }
}


