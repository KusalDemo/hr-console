import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  PerformanceReviewCycle,
  ReviewCycleStatus,
} from '../entities/performance-review-cycle.entity';

/**
 * Performance Review Cycle Repository
 *
 * Custom repository methods for review cycle queries.
 */
@Injectable()
export class PerformanceReviewCycleRepository extends Repository<PerformanceReviewCycle> {
  constructor(private dataSource: DataSource) {
    super(PerformanceReviewCycle, dataSource.createEntityManager());
  }

  /**
   * Find review cycle by ID
   */
  async findById(id: number, includeReviews = false): Promise<PerformanceReviewCycle | null> {
    const query = this.createQueryBuilder('cycle').where('cycle.id = :id', { id });

    if (includeReviews) {
      query.leftJoinAndSelect('cycle.reviews', 'reviews');
    }

    return query.getOne();
  }

  /**
   * Find review cycles by organization
   */
  async findByOrganization(
    organizationId: number,
    includeInactive = false,
  ): Promise<PerformanceReviewCycle[]> {
    const query = this.createQueryBuilder('cycle')
      .where('cycle.organizationId = :organizationId', { organizationId })
      .orderBy('cycle.periodStart', 'DESC')
      .addOrderBy('cycle.cycleName', 'ASC');

    if (!includeInactive) {
      query.andWhere('cycle.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  /**
   * Find review cycles by status
   */
  async findByStatus(
    status: ReviewCycleStatus,
    organizationId?: number,
  ): Promise<PerformanceReviewCycle[]> {
    const query = this.createQueryBuilder('cycle')
      .where('cycle.status = :status', { status })
      .orderBy('cycle.periodStart', 'DESC');

    if (organizationId) {
      query.andWhere('cycle.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find active review cycles
   */
  async findActive(organizationId?: number): Promise<PerformanceReviewCycle[]> {
    const query = this.createQueryBuilder('cycle')
      .where('cycle.status = :status', { status: ReviewCycleStatus.ACTIVE })
      .andWhere('cycle.isActive = :isActive', { isActive: true })
      .orderBy('cycle.periodStart', 'DESC');

    if (organizationId) {
      query.andWhere('cycle.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find review cycles in period
   */
  async findInPeriod(
    startDate: Date,
    endDate: Date,
    organizationId?: number,
  ): Promise<PerformanceReviewCycle[]> {
    const query = this.createQueryBuilder('cycle')
      .where('cycle.periodStart <= :endDate', { endDate })
      .andWhere('cycle.periodEnd >= :startDate', { startDate })
      .orderBy('cycle.periodStart', 'ASC');

    if (organizationId) {
      query.andWhere('cycle.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find review cycle templates
   */
  async findTemplates(organizationId?: number): Promise<PerformanceReviewCycle[]> {
    const query = this.createQueryBuilder('cycle')
      .where('cycle.isTemplate = :isTemplate', { isTemplate: true })
      .orderBy('cycle.cycleName', 'ASC');

    if (organizationId) {
      query.andWhere('cycle.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }
}
