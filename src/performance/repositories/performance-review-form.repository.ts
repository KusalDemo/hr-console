import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  PerformanceReviewForm,
  FormType,
  FormStatus,
} from '../entities/performance-review-form.entity';

/**
 * Performance Review Form Repository
 *
 * Custom repository methods for review form queries.
 */
@Injectable()
export class PerformanceReviewFormRepository extends Repository<PerformanceReviewForm> {
  constructor(private dataSource: DataSource) {
    super(PerformanceReviewForm, dataSource.createEntityManager());
  }

  /**
   * Find form by ID
   */
  async findById(id: number, includeReview = false): Promise<PerformanceReviewForm | null> {
    const query = this.createQueryBuilder('form').where('form.id = :id', { id });

    if (includeReview) {
      query.leftJoinAndSelect('form.performanceReview', 'performanceReview');
    }

    return query.getOne();
  }

  /**
   * Find forms by review
   */
  async findByReview(performanceReviewId: number): Promise<PerformanceReviewForm[]> {
    return this.createQueryBuilder('form')
      .where('form.performanceReviewId = :performanceReviewId', { performanceReviewId })
      .orderBy('form.formType', 'ASC')
      .addOrderBy('form.createdAt', 'ASC')
      .getMany();
  }

  /**
   * Find forms by type
   */
  async findByType(
    formType: FormType,
    performanceReviewId?: number,
  ): Promise<PerformanceReviewForm[]> {
    const query = this.createQueryBuilder('form')
      .where('form.formType = :formType', { formType })
      .orderBy('form.createdAt', 'ASC');

    if (performanceReviewId) {
      query.andWhere('form.performanceReviewId = :performanceReviewId', {
        performanceReviewId,
      });
    }

    return query.getMany();
  }

  /**
   * Find forms by status
   */
  async findByStatus(
    formStatus: FormStatus,
    performanceReviewId?: number,
  ): Promise<PerformanceReviewForm[]> {
    const query = this.createQueryBuilder('form')
      .where('form.formStatus = :formStatus', { formStatus })
      .orderBy('form.createdAt', 'ASC');

    if (performanceReviewId) {
      query.andWhere('form.performanceReviewId = :performanceReviewId', {
        performanceReviewId,
      });
    }

    return query.getMany();
  }

  /**
   * Find forms by reviewer
   */
  async findByReviewer(reviewerId: number): Promise<PerformanceReviewForm[]> {
    return this.createQueryBuilder('form')
      .where('form.reviewerId = :reviewerId', { reviewerId })
      .orderBy('form.createdAt', 'DESC')
      .getMany();
  }
}
