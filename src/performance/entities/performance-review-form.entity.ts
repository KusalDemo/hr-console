import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PerformanceReview } from './performance-review.entity';

/**
 * Form Type Enum
 */
export enum FormType {
  SELF_ASSESSMENT = 'SELF_ASSESSMENT', // Self-assessment form
  MANAGER_REVIEW = 'MANAGER_REVIEW', // Manager review form
  PEER_REVIEW = 'PEER_REVIEW', // Peer review form
  CUSTOM = 'CUSTOM', // Custom form
}

/**
 * Form Status Enum
 */
export enum FormStatus {
  DRAFT = 'DRAFT', // Draft
  IN_PROGRESS = 'IN_PROGRESS', // In progress
  SUBMITTED = 'SUBMITTED', // Submitted
  COMPLETED = 'COMPLETED', // Completed
}

/**
 * Performance Review Form Entity
 * 
 * Review forms with questions, ratings, and feedback.
 */
@Entity('performance_review_forms')
@Index('idx_review_forms_review', ['performanceReviewId'])
@Index('idx_review_forms_type', ['formType'])
@Index('idx_review_forms_status', ['formStatus'])
@Index('idx_review_forms_reviewer', ['reviewerId'])
export class PerformanceReviewForm {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Reference to performance review
   */
  @Column({ name: 'performance_review_id', type: 'bigint', nullable: false })
  performanceReviewId: number;

  /**
   * Performance review relationship
   */
  @ManyToOne(() => PerformanceReview, (review) => review.forms, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'performance_review_id' })
  performanceReview: PerformanceReview;

  /**
   * Form type
   */
  @Column({
    name: 'form_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: FormType.MANAGER_REVIEW,
  })
  formType: FormType;

  /**
   * Form status
   */
  @Column({
    name: 'form_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: FormStatus.DRAFT,
  })
  formStatus: FormStatus;

  /**
   * Reviewer ID (for peer reviews, this is the peer reviewer)
   */
  @Column({ name: 'reviewer_id', type: 'bigint', nullable: true })
  reviewerId: number | null;

  /**
   * Form title
   */
  @Column({ name: 'form_title', type: 'varchar', length: 255, nullable: false })
  formTitle: string;

  /**
   * Form questions and responses (JSON: array of question objects with responses)
   */
  @Column({ name: 'form_data', type: 'jsonb', nullable: false })
  formData: Array<{
    id: string;
    question: string;
    questionType: 'rating' | 'text' | 'multiple_choice' | 'yes_no';
    response?: any;
    rating?: number;
    comments?: string;
  }>;

  /**
   * Overall rating for this form
   */
  @Column({ name: 'form_rating', type: 'decimal', precision: 5, scale: 2, nullable: true })
  formRating: number | null;

  /**
   * Overall feedback/comments
   */
  @Column({ name: 'overall_feedback', type: 'text', nullable: true })
  overallFeedback: string | null;

  /**
   * Strengths identified
   */
  @Column({ name: 'strengths', type: 'text', nullable: true })
  strengths: string | null;

  /**
   * Areas for improvement
   */
  @Column({ name: 'areas_for_improvement', type: 'text', nullable: true })
  areasForImprovement: string | null;

  /**
   * Submitted date
   */
  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  /**
   * Form metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'form_metadata', type: 'jsonb', nullable: true })
  formMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
