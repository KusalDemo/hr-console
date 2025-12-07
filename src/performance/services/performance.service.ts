import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PerformanceReviewCycleRepository } from '../repositories/performance-review-cycle.repository';
import { PerformanceReviewRepository } from '../repositories/performance-review.repository';
import { PerformanceReviewFormRepository } from '../repositories/performance-review-form.repository';
import {
  PerformanceReviewCycle,
  ReviewCycleStatus,
} from '../entities/performance-review-cycle.entity';
import {
  PerformanceReview,
  ReviewStatus,
  ReviewType,
  OverallRating,
} from '../entities/performance-review.entity';
import {
  PerformanceReviewForm,
  FormType,
  FormStatus,
} from '../entities/performance-review-form.entity';

/**
 * Performance Service
 * 
 * Manages performance reviews with:
 * - Review cycle management
 * - Review workflows
 * - Calibration
 * - Improvement plans
 * - Integration with goals and KPIs
 */
@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);

  constructor(
    private readonly reviewCycleRepository: PerformanceReviewCycleRepository,
    private readonly reviewRepository: PerformanceReviewRepository,
    private readonly reviewFormRepository: PerformanceReviewFormRepository,
  ) {}

  // ========== Review Cycle Methods ==========

  /**
   * Create a new review cycle
   */
  async createReviewCycle(createDto: any, createdBy?: number): Promise<PerformanceReviewCycle> {
    // Validate period dates
    if (createDto.periodEnd <= createDto.periodStart) {
      throw new BadRequestException('Period end date must be after period start date');
    }

    const cycle = this.reviewCycleRepository.create({
      ...createDto,
      status: createDto.status || ReviewCycleStatus.DRAFT,
      isActive: true,
      createdBy,
    });

    const saved = await this.reviewCycleRepository.save(cycle);

    this.logger.log(`Created review cycle: ${saved.id} (${saved.cycleName})`);

    return saved;
  }

  /**
   * Get review cycle by ID
   */
  async getReviewCycleById(
    id: number,
    includeReviews = false,
  ): Promise<PerformanceReviewCycle> {
    const cycle = await this.reviewCycleRepository.findById(id, includeReviews);

    if (!cycle) {
      throw new NotFoundException(`Review cycle with ID ${id} not found`);
    }

    return cycle;
  }

  /**
   * Update review cycle
   */
  async updateReviewCycle(
    id: number,
    updateDto: any,
    updatedBy?: number,
  ): Promise<PerformanceReviewCycle> {
    const cycle = await this.reviewCycleRepository.findById(id);

    if (!cycle) {
      throw new NotFoundException(`Review cycle with ID ${id} not found`);
    }

    Object.assign(cycle, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.reviewCycleRepository.save(cycle);

    this.logger.log(`Updated review cycle: ${id}`);

    return saved;
  }

  /**
   * Start review cycle
   */
  async startReviewCycle(id: number, updatedBy?: number): Promise<PerformanceReviewCycle> {
    const cycle = await this.reviewCycleRepository.findById(id);

    if (!cycle) {
      throw new NotFoundException(`Review cycle with ID ${id} not found`);
    }

    if (cycle.status !== ReviewCycleStatus.DRAFT) {
      throw new BadRequestException('Can only start draft review cycles');
    }

    cycle.status = ReviewCycleStatus.ACTIVE;
    cycle.updatedBy = updatedBy;

    return this.reviewCycleRepository.save(cycle);
  }

  // ========== Performance Review Methods ==========

  /**
   * Create a new performance review
   */
  async createPerformanceReview(createDto: any, createdBy?: number): Promise<PerformanceReview> {
    // Validate review cycle exists
    const cycle = await this.reviewCycleRepository.findById(createDto.reviewCycleId);

    if (!cycle) {
      throw new NotFoundException(`Review cycle with ID ${createDto.reviewCycleId} not found`);
    }

    const review = this.reviewRepository.create({
      ...createDto,
      reviewType: createDto.reviewType || ReviewType.ANNUAL,
      status: createDto.status || ReviewStatus.NOT_STARTED,
      createdBy,
    });

    const saved = await this.reviewRepository.save(review);

    this.logger.log(`Created performance review: ${saved.id} for employee ${createDto.employeeId}`);

    return saved;
  }

  /**
   * Get performance review by ID
   */
  async getPerformanceReviewById(
    id: number,
    includeForms = false,
  ): Promise<PerformanceReview> {
    const review = await this.reviewRepository.findById(id, includeForms);

    if (!review) {
      throw new NotFoundException(`Performance review with ID ${id} not found`);
    }

    return review;
  }

  /**
   * Update performance review
   */
  async updatePerformanceReview(
    id: number,
    updateDto: any,
    updatedBy?: number,
  ): Promise<PerformanceReview> {
    const review = await this.reviewRepository.findById(id);

    if (!review) {
      throw new NotFoundException(`Performance review with ID ${id} not found`);
    }

    Object.assign(review, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.reviewRepository.save(review);

    this.logger.log(`Updated performance review: ${id}`);

    return saved;
  }

  /**
   * Complete self-assessment
   */
  async completeSelfAssessment(
    reviewId: number,
    updatedBy?: number,
  ): Promise<PerformanceReview> {
    const review = await this.reviewRepository.findById(reviewId, true);

    if (!review) {
      throw new NotFoundException(`Performance review with ID ${reviewId} not found`);
    }

    if (review.status !== ReviewStatus.SELF_ASSESSMENT) {
      throw new BadRequestException('Review is not in self-assessment phase');
    }

    review.status = ReviewStatus.MANAGER_REVIEW;
    review.selfAssessmentCompletedAt = new Date();
    review.updatedBy = updatedBy;

    return this.reviewRepository.save(review);
  }

  /**
   * Complete manager review
   */
  async completeManagerReview(
    reviewId: number,
    overallRating?: OverallRating,
    overallScore?: number,
    updatedBy?: number,
  ): Promise<PerformanceReview> {
    const review = await this.reviewRepository.findById(reviewId, true);

    if (!review) {
      throw new NotFoundException(`Performance review with ID ${reviewId} not found`);
    }

    if (review.status !== ReviewStatus.MANAGER_REVIEW) {
      throw new BadRequestException('Review is not in manager review phase');
    }

    // Calculate overall score from forms if not provided
    if (!overallScore && review.forms && Array.isArray(review.forms)) {
      const forms = await this.reviewFormRepository.findByReview(reviewId);
      const ratings = forms
        .map((f) => parseFloat(f.formRating?.toString() || '0'))
        .filter((r) => r > 0);

      if (ratings.length > 0) {
        overallScore = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      }
    }

    review.status = ReviewStatus.CALIBRATION;
    review.managerReviewCompletedAt = new Date();
    review.overallRating = overallRating || review.overallRating;
    review.overallScore = overallScore || review.overallScore;
    review.updatedBy = updatedBy;

    return this.reviewRepository.save(review);
  }

  /**
   * Complete review
   */
  async completeReview(
    reviewId: number,
    updatedBy?: number,
  ): Promise<PerformanceReview> {
    const review = await this.reviewRepository.findById(reviewId);

    if (!review) {
      throw new NotFoundException(`Performance review with ID ${reviewId} not found`);
    }

    if (review.status !== ReviewStatus.CALIBRATION) {
      throw new BadRequestException('Review must be in calibration phase before completion');
    }

    review.status = ReviewStatus.COMPLETED;
    review.reviewCompletedAt = new Date();
    review.updatedBy = updatedBy;

    return this.reviewRepository.save(review);
  }

  /**
   * Acknowledge review
   */
  async acknowledgeReview(
    reviewId: number,
    updatedBy?: number,
  ): Promise<PerformanceReview> {
    const review = await this.reviewRepository.findById(reviewId);

    if (!review) {
      throw new NotFoundException(`Performance review with ID ${reviewId} not found`);
    }

    if (review.status !== ReviewStatus.COMPLETED) {
      throw new BadRequestException('Can only acknowledge completed reviews');
    }

    review.employeeAcknowledgedAt = new Date();
    review.updatedBy = updatedBy;

    return this.reviewRepository.save(review);
  }

  /**
   * Create improvement plan
   */
  async createImprovementPlan(
    reviewId: number,
    improvementPlan: Record<string, any>,
    updatedBy?: number,
  ): Promise<PerformanceReview> {
    const review = await this.reviewRepository.findById(reviewId);

    if (!review) {
      throw new NotFoundException(`Performance review with ID ${reviewId} not found`);
    }

    review.improvementPlan = improvementPlan;
    review.updatedBy = updatedBy;

    return this.reviewRepository.save(review);
  }

  // ========== Review Form Methods ==========

  /**
   * Create review form
   */
  async createReviewForm(createDto: any, createdBy?: number): Promise<PerformanceReviewForm> {
    const form = this.reviewFormRepository.create({
      ...createDto,
      formType: createDto.formType || FormType.MANAGER_REVIEW,
      formStatus: createDto.formStatus || FormStatus.DRAFT,
      createdBy,
    });

    const saved = await this.reviewFormRepository.save(form);

    this.logger.log(`Created review form: ${saved.id} for review ${createDto.performanceReviewId}`);

    return saved;
  }

  /**
   * Update review form
   */
  async updateReviewForm(
    id: number,
    updateDto: any,
    updatedBy?: number,
  ): Promise<PerformanceReviewForm> {
    const form = await this.reviewFormRepository.findById(id);

    if (!form) {
      throw new NotFoundException(`Review form with ID ${id} not found`);
    }

    Object.assign(form, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.reviewFormRepository.save(form);

    this.logger.log(`Updated review form: ${id}`);

    return saved;
  }

  /**
   * Submit review form
   */
  async submitReviewForm(
    id: number,
    updatedBy?: number,
  ): Promise<PerformanceReviewForm> {
    const form = await this.reviewFormRepository.findById(id);

    if (!form) {
      throw new NotFoundException(`Review form with ID ${id} not found`);
    }

    if (form.formStatus === FormStatus.COMPLETED) {
      throw new BadRequestException('Form is already completed');
    }

    form.formStatus = FormStatus.SUBMITTED;
    form.submittedAt = new Date();
    form.updatedBy = updatedBy;

    const saved = await this.reviewFormRepository.save(form);

    this.logger.log(`Submitted review form: ${id}`);

    return saved;
  }

  /**
   * Get reviews by employee
   */
  async getReviewsByEmployee(
    employeeId: number,
    organizationId?: number,
  ): Promise<PerformanceReview[]> {
    return this.reviewRepository.findByEmployee(employeeId, organizationId);
  }

  /**
   * Get reviews by reviewer
   */
  async getReviewsByReviewer(
    reviewerId: number,
    organizationId?: number,
  ): Promise<PerformanceReview[]> {
    return this.reviewRepository.findByReviewer(reviewerId, organizationId);
  }

  /**
   * Get review cycle statistics
   */
  async getCycleStatistics(reviewCycleId: number): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    averageScore: number;
  }> {
    return this.reviewRepository.getCycleStatistics(reviewCycleId);
  }
}
