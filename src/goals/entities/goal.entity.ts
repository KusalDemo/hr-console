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
import { KeyResult } from './key-result.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Employee } from '../../employees/entities/employee.entity';

/**
 * Goal Type Enum
 */
export enum GoalType {
  ORGANIZATIONAL = 'ORGANIZATIONAL', // Organization-level goal
  DEPARTMENT = 'DEPARTMENT', // Department-level goal
  TEAM = 'TEAM', // Team-level goal
  INDIVIDUAL = 'INDIVIDUAL', // Individual employee goal
}

/**
 * Goal Status Enum
 */
export enum GoalStatus {
  DRAFT = 'DRAFT', // Draft goal
  ACTIVE = 'ACTIVE', // Active goal
  ON_HOLD = 'ON_HOLD', // On hold
  COMPLETED = 'COMPLETED', // Completed
  CANCELLED = 'CANCELLED', // Cancelled
  ARCHIVED = 'ARCHIVED', // Archived
}

/**
 * Goal Priority Enum
 */
export enum GoalPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Goal Entity
 *
 * Objectives and Key Results (OKR) tracking with:
 * - Goal alignment (cascading from org to individual)
 * - Progress tracking
 * - Check-ins
 * - Milestone management
 * - Goal templates and cloning
 * - Integration with performance reviews
 */
@Entity('goals')
@Index('idx_goals_organization', ['organizationId'])
@Index('idx_goals_owner', ['ownerId'])
@Index('idx_goals_type', ['goalType'])
@Index('idx_goals_status', ['status'])
@Index('idx_goals_parent', ['parentGoalId'])
@Index('idx_goals_template', ['isTemplate'])
@Index('idx_goals_archived', ['isArchived'])
@Index('idx_goals_period', ['periodStart', 'periodEnd'])
export class Goal {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Goal title/objective
   */
  @Column({ name: 'goal_title', type: 'varchar', length: 255, nullable: false })
  goalTitle: string;

  /**
   * Goal description
   */
  @Column({ name: 'goal_description', type: 'text', nullable: true })
  goalDescription: string | null;

  /**
   * Goal type
   */
  @Column({
    name: 'goal_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: GoalType.INDIVIDUAL,
  })
  goalType: GoalType;

  /**
   * Goal status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: GoalStatus.DRAFT,
  })
  status: GoalStatus;

  /**
   * Goal priority
   */
  @Column({
    name: 'priority',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: GoalPriority.MEDIUM,
  })
  priority: GoalPriority;

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
   * Owner ID (employee ID for individual goals, team ID for team goals, etc.)
   */
  @Column({ name: 'owner_id', type: 'bigint', nullable: false })
  ownerId: number;

  /**
   * Owner relationship (for individual goals)
   */
  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_id' })
  owner: Employee | null;

  /**
   * Department ID (for department goals)
   */
  @Column({ name: 'department_id', type: 'bigint', nullable: true })
  departmentId: number | null;

  /**
   * Team ID (for team goals)
   */
  @Column({ name: 'team_id', type: 'bigint', nullable: true })
  teamId: number | null;

  /**
   * Parent goal ID (for goal alignment/cascading)
   */
  @Column({ name: 'parent_goal_id', type: 'bigint', nullable: true })
  parentGoalId: number | null;

  /**
   * Parent goal relationship
   */
  @ManyToOne(() => Goal, (goal) => goal.childGoals, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_goal_id' })
  parentGoal: Goal | null;

  /**
   * Child goals (for goal alignment)
   */
  @OneToMany(() => Goal, (goal) => goal.parentGoal, {
    cascade: false,
    lazy: true,
  })
  childGoals: Promise<Goal[]> | Goal[];

  /**
   * Template ID (if goal was created from a template)
   */
  @Column({ name: 'template_id', type: 'bigint', nullable: true })
  templateId: number | null;

  /**
   * Whether this goal is a template
   */
  @Column({ name: 'is_template', type: 'boolean', nullable: false, default: false })
  isTemplate: boolean;

  /**
   * Goal period start date
   */
  @Column({ name: 'period_start', type: 'date', nullable: false })
  periodStart: Date;

  /**
   * Goal period end date
   */
  @Column({ name: 'period_end', type: 'date', nullable: false })
  periodEnd: Date;

  /**
   * Target completion date
   */
  @Column({ name: 'target_completion_date', type: 'date', nullable: true })
  targetCompletionDate: Date | null;

  /**
   * Actual completion date
   */
  @Column({ name: 'actual_completion_date', type: 'date', nullable: true })
  actualCompletionDate: Date | null;

  /**
   * Overall progress percentage (0-100)
   */
  @Column({
    name: 'progress_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: false,
    default: 0,
  })
  progressPercentage: number;

  /**
   * Last check-in date
   */
  @Column({ name: 'last_check_in_date', type: 'date', nullable: true })
  lastCheckInDate: Date | null;

  /**
   * Next check-in date
   */
  @Column({ name: 'next_check_in_date', type: 'date', nullable: true })
  nextCheckInDate: Date | null;

  /**
   * Check-in frequency (e.g., "weekly", "bi-weekly", "monthly")
   */
  @Column({ name: 'check_in_frequency', type: 'varchar', length: 32, nullable: true })
  checkInFrequency: string | null;

  /**
   * Number of check-ins completed
   */
  @Column({ name: 'check_ins_completed', type: 'integer', nullable: false, default: 0 })
  checkInsCompleted: number;

  /**
   * Milestones (JSON array of milestone objects)
   */
  @Column({ name: 'milestones', type: 'jsonb', nullable: true })
  milestones: Array<{
    id: string;
    title: string;
    description?: string;
    targetDate: string;
    completedDate?: string;
    completed: boolean;
  }> | null;

  /**
   * Metrics (JSON array of metric definitions)
   */
  @Column({ name: 'metrics', type: 'jsonb', nullable: true })
  metrics: Array<{
    id: string;
    name: string;
    unit: string;
    targetValue: number;
    currentValue?: number;
    formula?: string;
  }> | null;

  /**
   * Key results relationship
   */
  @OneToMany(() => KeyResult, (keyResult) => keyResult.goal, {
    cascade: true,
    lazy: true,
  })
  keyResults: Promise<KeyResult[]> | KeyResult[];

  /**
   * Performance review ID (if linked to a performance review)
   */
  @Column({ name: 'performance_review_id', type: 'bigint', nullable: true })
  performanceReviewId: number | null;

  /**
   * Whether goal is archived
   */
  @Column({ name: 'is_archived', type: 'boolean', nullable: false, default: false })
  isArchived: boolean;

  /**
   * Goal metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'goal_metadata', type: 'jsonb', nullable: true })
  goalMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
