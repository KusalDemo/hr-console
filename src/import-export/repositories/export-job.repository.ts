import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ExportJob, ExportJobStatus } from '../entities/export-job.entity';

/**
 * Export Job Repository
 * Provides custom queries for export job operations
 */
@Injectable()
export class ExportJobRepository extends Repository<ExportJob> {
  constructor(private dataSource: DataSource) {
    super(ExportJob, dataSource.createEntityManager());
  }

  /**
   * Find export job by ID
   */
  async findById(id: number, includeRelations = false): Promise<ExportJob | null> {
    const query = this.createQueryBuilder('job').where('job.id = :id', { id });

    if (includeRelations) {
      query
        .leftJoinAndSelect('job.template', 'template')
        .leftJoinAndSelect('job.organization', 'organization');
    }

    return query.getOne();
  }

  /**
   * Find export jobs by status
   */
  async findByStatus(status: ExportJobStatus): Promise<ExportJob[]> {
    return this.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find export jobs by entity type
   */
  async findByEntityType(entityType: string, organizationId?: number): Promise<ExportJob[]> {
    const query = this.createQueryBuilder('job')
      .where('job.entityType = :entityType', { entityType })
      .orderBy('job.createdAt', 'DESC');

    if (organizationId !== undefined) {
      query.andWhere('job.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find export jobs by organization
   */
  async findByOrganization(organizationId: number): Promise<ExportJob[]> {
    return this.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find scheduled export jobs that need to be executed
   */
  async findScheduledJobsToExecute(): Promise<ExportJob[]> {
    const now = new Date();
    return this.createQueryBuilder('job')
      .where('job.isScheduled = :isScheduled', { isScheduled: true })
      .andWhere('job.status = :status', { status: ExportJobStatus.PENDING })
      .andWhere('job.scheduledAt <= :now', { now })
      .orderBy('job.scheduledAt', 'ASC')
      .getMany();
  }

  /**
   * Find export jobs with pagination
   */
  async findWithPagination(
    page: number,
    limit: number,
    filters?: {
      status?: ExportJobStatus;
      entityType?: string;
      organizationId?: number;
      isScheduled?: boolean;
    },
  ): Promise<{ jobs: ExportJob[]; total: number }> {
    const query = this.createQueryBuilder('job');

    if (filters?.status) {
      query.andWhere('job.status = :status', { status: filters.status });
    }

    if (filters?.entityType) {
      query.andWhere('job.entityType = :entityType', { entityType: filters.entityType });
    }

    if (filters?.organizationId !== undefined) {
      query.andWhere('job.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    if (filters?.isScheduled !== undefined) {
      query.andWhere('job.isScheduled = :isScheduled', { isScheduled: filters.isScheduled });
    }

    query
      .orderBy('job.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [jobs, total] = await query.getManyAndCount();

    return { jobs, total };
  }

  /**
   * Find active export jobs (pending or processing)
   */
  async findActiveJobs(organizationId?: number): Promise<ExportJob[]> {
    const query = this.createQueryBuilder('job')
      .where('job.status IN (:...statuses)', {
        statuses: [ExportJobStatus.PENDING, ExportJobStatus.PROCESSING],
      })
      .orderBy('job.createdAt', 'ASC');

    if (organizationId !== undefined) {
      query.andWhere('job.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Count export jobs by status
   */
  async countByStatus(status: ExportJobStatus, organizationId?: number): Promise<number> {
    const query = this.createQueryBuilder('job').where('job.status = :status', { status });

    if (organizationId !== undefined) {
      query.andWhere('job.organizationId = :organizationId', { organizationId });
    }

    return query.getCount();
  }

  /**
   * Get export statistics for an organization
   */
  async getExportStatistics(organizationId: number): Promise<{
    total: number;
    completed: number;
    failed: number;
    processing: number;
    pending: number;
  }> {
    const stats = await this.createQueryBuilder('job')
      .select('job.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('job.organizationId = :organizationId', { organizationId })
      .groupBy('job.status')
      .getRawMany();

    const result = {
      total: 0,
      completed: 0,
      failed: 0,
      processing: 0,
      pending: 0,
    };

    stats.forEach((stat) => {
      const count = parseInt(stat.count, 10);
      result.total += count;

      switch (stat.status) {
        case ExportJobStatus.COMPLETED:
          result.completed += count;
          break;
        case ExportJobStatus.FAILED:
          result.failed += count;
          break;
        case ExportJobStatus.PROCESSING:
          result.processing += count;
          break;
        case ExportJobStatus.PENDING:
          result.pending += count;
          break;
      }
    });

    return result;
  }
}
