import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { PerformanceReviewCycle } from './performance-review-cycle.entity';
import { PerformanceReviewForm } from './performance-review-form.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { Organization } from '../../organizations/entities/organization.entity';

/**
 * Review Status Enum
 */
export enum ReviewStatus {
  NOT_STARTED = 'NOT_STARTED', // Not started
  SELF_ASSESSMENT = 'SELF_ASSESSMENT', // Self-assessment in progress
  MANAGER_REVIEW = 'MANAGER_REVIEW', // Manager review in progress
  PEER_REVIEW = 'PEER_REVIEW', // Peer reviews in progress
  CALIBRATION = 'CALIBRATION', // Calibration phase
  COMPLETED = 'COMPLETED', // Review completed
  CANCELLED = 'CANCELLED', // Review cancelled
}

/**
 * Review Type Enum
 */
export enum ReviewType {
  ANNUAL = 'ANNUAL', // Annual review
  MID_YEAR = 'MID_YEAR', // Mid-year review
  QUARTERLY = 'QUARTERLY', // Quarterly review
  PROJECT = 'PROJECT', // Project-based review
  PROBATION = 'PROBATION', // Probation review
  PROMOTION = 'PROMOTION', // Promotion review
  CUSTOM = 'CUSTOM', // Custom review
}

/**
 * Overall Rating Enum
 */
export enum OverallRating {
  EXCEEDS_EXPECTATIONS = 'EXCEEDS_EXPECTATIONS', // Exceeds expectations
  MEETS_EXPECTATIONS = 'MEETS_EXPECTATIONS', // Meets expectations
  NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT', // Needs improvement
  UNSATISFACTORY = 'UNSATISFACTORY', // Unsatisfactory
  NOT_RATED = 'NOT_RATED', // Not rated
}

/**
 * Performance Review Entity
 *
 * Individual performance reviews with forms, ratings, feedback, and workflows.
 */
@Entity('performance_reviews')
@Index('idx_performance_reviews_cycle', ['reviewCycleId'])
@Index('idx_performance_reviews_employee', ['employeeId'])
@Index('idx_performance_reviews_reviewer', ['reviewerId'])
@Index('idx_performance_reviews_status', ['status'])
@Index('idx_performance_reviews_organization', ['organizationId'])
@Index('idx_performance_reviews_type', ['reviewType'])
export class PerformanceReview {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Reference to review cycle
   */
  @Column({ name: 'review_cycle_id', type: 'bigint', nullable: false })
  reviewCycleId: number;

  /**
   * Review cycle relationship
   */
  @ManyToOne(() => PerformanceReviewCycle, (cycle) => cycle.reviews, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'review_cycle_id' })
  reviewCycle: PerformanceReviewCycle;

  /**
   * Employee being reviewed
   */
  @Column({ name: 'employee_id', type: 'bigint', nullable: false })
  employeeId: number;

  /**
   * Employee relationship
   */
  @ManyToOne(() => Employee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  /**
   * Reviewer ID (manager)
   */
  @Column({ name: 'reviewer_id', type: 'bigint', nullable: false })
  reviewerId: number;

  /**
   * Reviewer relationship
   */
  @ManyToOne(() => Employee, { nullable: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: Employee;

  /**
   * Organization ID
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  /**
   * Organization relationship
   */
  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  /**
   * Review type
   */
  @Column({
    name: 'review_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ReviewType.ANNUAL,
  })
  reviewType: ReviewType;

  /**
   * Review status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ReviewStatus.NOT_STARTED,
  })
  status: ReviewStatus;

  /**
   * Overall rating
   */
  @Column({
    name: 'overall_rating',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  overallRating: OverallRating | null;

  /**
   * Overall score (numeric, 0-100)
   */
  @Column({ name: 'overall_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  overallScore: number | null;

  /**
   * Self-assessment completed date
   */
  @Column({ name: 'self_assessment_completed_at', type: 'timestamptz', nullable: true })
  selfAssessmentCompletedAt: Date | null;

  /**
   * Manager review completed date
   */
  @Column({ name: 'manager_review_completed_at', type: 'timestamptz', nullable: true })
  managerReviewCompletedAt: Date | null;

  /**
   * Review completed date
   */
  @Column({ name: 'review_completed_at', type: 'timestamptz', nullable: true })
  reviewCompletedAt: Date | null;

  /**
   * Employee acknowledgment date
   */
  @Column({ name: 'employee_acknowledged_at', type: 'timestamptz', nullable: true })
  employeeAcknowledgedAt: Date | null;

  /**
   * Improvement plan (JSON: goals, actions, timeline)
   */
  @Column({ name: 'improvement_plan', type: 'jsonb', nullable: true })
  improvementPlan: Record<string, any> | null;

  /**
   * Review forms relationship
   */
  @OneToMany(() => PerformanceReviewForm, (form) => form.performanceReview, {
    cascade: true,
    lazy: true,
  })
  forms: Promise<PerformanceReviewForm[]> | PerformanceReviewForm[];

  /**
   * Review metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'review_metadata', type: 'jsonb', nullable: true })
  reviewMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
