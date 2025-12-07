import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ImportJob, ImportJobStatus } from '../entities/import-job.entity';

/**
 * Import Job Repository
 * Provides custom queries for import job operations
 */
@Injectable()
export class ImportJobRepository extends Repository<ImportJob> {
  constructor(private dataSource: DataSource) {
    super(ImportJob, dataSource.createEntityManager());
  }

  /**
   * Find import job by ID
   */
  async findById(id: number, includeRelations = false): Promise<ImportJob | null> {
    const query = this.createQueryBuilder('job')
      .where('job.id = :id', { id });

    if (includeRelations) {
      query
        .leftJoinAndSelect('job.template', 'template')
        .leftJoinAndSelect('job.organization', 'organization');
    }

    return query.getOne();
  }

  /**
   * Find import jobs by status
   */
  async findByStatus(status: ImportJobStatus): Promise<ImportJob[]> {
    return this.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find import jobs by entity type
   */
  async findByEntityType(
    entityType: string,
    organizationId?: number,
  ): Promise<ImportJob[]> {
    const query = this.createQueryBuilder('job')
      .where('job.entityType = :entityType', { entityType })
      .orderBy('job.createdAt', 'DESC');

    if (organizationId !== undefined) {
      query.andWhere('job.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find import jobs by organization
   */
  async findByOrganization(organizationId: number): Promise<ImportJob[]> {
    return this.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find import jobs with pagination
   */
  async findWithPagination(
    page: number,
    limit: number,
    filters?: {
      status?: ImportJobStatus;
      entityType?: string;
      organizationId?: number;
    },
  ): Promise<{ jobs: ImportJob[]; total: number }> {
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

    query
      .orderBy('job.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [jobs, total] = await query.getManyAndCount();

    return { jobs, total };
  }

  /**
   * Find active import jobs (pending or processing)
   */
  async findActiveJobs(organizationId?: number): Promise<ImportJob[]> {
    const query = this.createQueryBuilder('job')
      .where('job.status IN (:...statuses)', {
        statuses: [ImportJobStatus.PENDING, ImportJobStatus.PROCESSING],
      })
      .orderBy('job.createdAt', 'ASC');

    if (organizationId !== undefined) {
      query.andWhere('job.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Count import jobs by status
   */
  async countByStatus(status: ImportJobStatus, organizationId?: number): Promise<number> {
    const query = this.createQueryBuilder('job')
      .where('job.status = :status', { status });

    if (organizationId !== undefined) {
      query.andWhere('job.organizationId = :organizationId', { organizationId });
    }

    return query.getCount();
  }

  /**
   * Get import statistics for an organization
   */
  async getImportStatistics(organizationId: number): Promise<{
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
        case ImportJobStatus.COMPLETED:
        case ImportJobStatus.PARTIALLY_COMPLETED:
          result.completed += count;
          break;
        case ImportJobStatus.FAILED:
          result.failed += count;
          break;
        case ImportJobStatus.PROCESSING:
          result.processing += count;
          break;
        case ImportJobStatus.PENDING:
          result.pending += count;
          break;
      }
    });

    return result;
  }
}
