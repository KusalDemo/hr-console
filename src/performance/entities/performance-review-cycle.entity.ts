import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { PerformanceReview } from './performance-review.entity';

/**
 * Review Cycle Status Enum
 */
export enum ReviewCycleStatus {
  DRAFT = 'DRAFT', // Draft cycle
  ACTIVE = 'ACTIVE', // Active cycle
  IN_PROGRESS = 'IN_PROGRESS', // Reviews in progress
  CALIBRATION = 'CALIBRATION', // Calibration phase
  COMPLETED = 'COMPLETED', // Cycle completed
  ARCHIVED = 'ARCHIVED', // Archived
}

/**
 * Performance Review Cycle Entity
 *
 * Review cycles with periods, templates, and review management.
 */
@Entity('performance_review_cycles')
@Index('idx_review_cycles_organization', ['organizationId'])
@Index('idx_review_cycles_status', ['status'])
@Index('idx_review_cycles_period', ['periodStart', 'periodEnd'])
@Index('idx_review_cycles_active', ['isActive'])
export class PerformanceReviewCycle {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Cycle name
   */
  @Column({ name: 'cycle_name', type: 'varchar', length: 255, nullable: false })
  cycleName: string;

  /**
   * Cycle description
   */
  @Column({ name: 'cycle_description', type: 'text', nullable: true })
  cycleDescription: string | null;

  /**
   * Organization ID
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  /**
   * Department ID (if department-specific)
   */
  @Column({ name: 'department_id', type: 'bigint', nullable: true })
  departmentId: number | null;

  /**
   * Review period start date
   */
  @Column({ name: 'period_start', type: 'date', nullable: false })
  periodStart: Date;

  /**
   * Review period end date
   */
  @Column({ name: 'period_end', type: 'date', nullable: false })
  periodEnd: Date;

  /**
   * Self-assessment start date
   */
  @Column({ name: 'self_assessment_start', type: 'date', nullable: true })
  selfAssessmentStart: Date | null;

  /**
   * Self-assessment end date
   */
  @Column({ name: 'self_assessment_end', type: 'date', nullable: true })
  selfAssessmentEnd: Date | null;

  /**
   * Manager review start date
   */
  @Column({ name: 'manager_review_start', type: 'date', nullable: true })
  managerReviewStart: Date | null;

  /**
   * Manager review end date
   */
  @Column({ name: 'manager_review_end', type: 'date', nullable: true })
  managerReviewEnd: Date | null;

  /**
   * Calibration start date
   */
  @Column({ name: 'calibration_start', type: 'date', nullable: true })
  calibrationStart: Date | null;

  /**
   * Calibration end date
   */
  @Column({ name: 'calibration_end', type: 'date', nullable: true })
  calibrationEnd: Date | null;

  /**
   * Review cycle status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ReviewCycleStatus.DRAFT,
  })
  status: ReviewCycleStatus;

  /**
   * Whether cycle is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Whether cycle is a template
   */
  @Column({ name: 'is_template', type: 'boolean', nullable: false, default: false })
  isTemplate: boolean;

  /**
   * Template ID (if cloned from template)
   */
  @Column({ name: 'template_id', type: 'bigint', nullable: true })
  templateId: number | null;

  /**
   * Cycle metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'cycle_metadata', type: 'jsonb', nullable: true })
  cycleMetadata: Record<string, any> | null;

  /**
   * Performance reviews in this cycle
   */
  @OneToMany(() => PerformanceReview, (review) => review.reviewCycle, {
    cascade: false,
    lazy: true,
  })
  reviews: Promise<PerformanceReview[]> | PerformanceReview[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
