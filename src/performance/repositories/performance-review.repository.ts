import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PerformanceReview, ReviewStatus, ReviewType } from '../entities/performance-review.entity';

/**
 * Performance Review Repository
 * 
 * Custom repository methods for performance review queries.
 */
@Injectable()
export class PerformanceReviewRepository extends Repository<PerformanceReview> {
  constructor(private dataSource: DataSource) {
    super(PerformanceReview, dataSource.createEntityManager());
  }

  /**
   * Find review by ID
   */
  async findById(id: number, includeForms = false): Promise<PerformanceReview | null> {
    const query = this.createQueryBuilder('review').where('review.id = :id', { id });

    if (includeForms) {
      query.leftJoinAndSelect('review.forms', 'forms');
    }

    return query.getOne();
  }

  /**
   * Find reviews by employee
   */
  async findByEmployee(
    employeeId: number,
    organizationId?: number,
  ): Promise<PerformanceReview[]> {
    const query = this.createQueryBuilder('review')
      .where('review.employeeId = :employeeId', { employeeId })
      .orderBy('review.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('review.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find reviews by reviewer
   */
  async findByReviewer(
    reviewerId: number,
    organizationId?: number,
  ): Promise<PerformanceReview[]> {
    const query = this.createQueryBuilder('review')
      .where('review.reviewerId = :reviewerId', { reviewerId })
      .orderBy('review.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('review.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find reviews by cycle
   */
  async findByCycle(
    reviewCycleId: number,
    includeCompleted = true,
  ): Promise<PerformanceReview[]> {
    const query = this.createQueryBuilder('review')
      .where('review.reviewCycleId = :reviewCycleId', { reviewCycleId })
      .orderBy('review.createdAt', 'ASC');

    if (!includeCompleted) {
      query.andWhere('review.status != :status', { status: ReviewStatus.COMPLETED });
    }

    return query.getMany();
  }

  /**
   * Find reviews by status
   */
  async findByStatus(
    status: ReviewStatus,
    organizationId?: number,
  ): Promise<PerformanceReview[]> {
    const query = this.createQueryBuilder('review')
      .where('review.status = :status', { status })
      .orderBy('review.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('review.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find reviews by type
   */
  async findByType(
    reviewType: ReviewType,
    organizationId?: number,
  ): Promise<PerformanceReview[]> {
    const query = this.createQueryBuilder('review')
      .where('review.reviewType = :reviewType', { reviewType })
      .orderBy('review.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('review.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Get review statistics for cycle
   */
  async getCycleStatistics(reviewCycleId: number): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    averageScore: number;
  }> {
    const result = await this.createQueryBuilder('review')
      .select('COUNT(*)', 'total')
      .addSelect(
        `COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)`,
        'completed',
      )
      .addSelect(
        `COUNT(CASE WHEN status IN ('SELF_ASSESSMENT', 'MANAGER_REVIEW', 'PEER_REVIEW') THEN 1 END)`,
        'inProgress',
      )
      .addSelect(
        `COUNT(CASE WHEN status = 'NOT_STARTED' THEN 1 END)`,
        'notStarted',
      )
      .addSelect('AVG(overall_score)', 'averageScore')
      .where('review.reviewCycleId = :reviewCycleId', { reviewCycleId })
      .getRawOne();

    return {
      total: parseInt(result.total) || 0,
      completed: parseInt(result.completed) || 0,
      inProgress: parseInt(result.inProgress) || 0,
      notStarted: parseInt(result.notStarted) || 0,
      averageScore: parseFloat(result.averageScore) || 0,
    };
  }
}
