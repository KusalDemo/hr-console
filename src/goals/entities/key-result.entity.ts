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
import { Goal } from './goal.entity';

/**
 * Key Result Status Enum
 */
export enum KeyResultStatus {
  NOT_STARTED = 'NOT_STARTED', // Not started
  IN_PROGRESS = 'IN_PROGRESS', // In progress
  AT_RISK = 'AT_RISK', // At risk
  COMPLETED = 'COMPLETED', // Completed
  CANCELLED = 'CANCELLED', // Cancelled
}

/**
 * Key Result Type Enum
 */
export enum KeyResultType {
  PERCENTAGE = 'PERCENTAGE', // Percentage-based (0-100%)
  NUMERIC = 'NUMERIC', // Numeric value
  BINARY = 'BINARY', // Yes/No (0 or 1)
  CURRENCY = 'CURRENCY', // Currency value
  CUSTOM = 'CUSTOM', // Custom metric
}

/**
 * Key Result Entity
 * 
 * Key results for OKR goals with:
 * - Progress tracking
 * - Target and current values
 * - Status tracking
 * - Check-in history
 */
@Entity('key_results')
@Index('idx_key_results_goal', ['goalId'])
@Index('idx_key_results_status', ['status'])
@Index('idx_key_results_owner', ['ownerId'])
export class KeyResult {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Reference to goal
   */
  @Column({ name: 'goal_id', type: 'bigint', nullable: false })
  goalId: number;

  /**
   * Goal relationship
   */
  @ManyToOne(() => Goal, (goal) => goal.keyResults, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goal_id' })
  goal: Goal;

  /**
   * Key result title
   */
  @Column({ name: 'key_result_title', type: 'varchar', length: 255, nullable: false })
  keyResultTitle: string;

  /**
   * Key result description
   */
  @Column({ name: 'key_result_description', type: 'text', nullable: true })
  keyResultDescription: string | null;

  /**
   * Key result type
   */
  @Column({
    name: 'key_result_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: KeyResultType.PERCENTAGE,
  })
  keyResultType: KeyResultType;

  /**
   * Key result status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: KeyResultStatus.NOT_STARTED,
  })
  status: KeyResultStatus;

  /**
   * Owner ID (employee responsible for this key result)
   */
  @Column({ name: 'owner_id', type: 'bigint', nullable: false })
  ownerId: number;

  /**
   * Target value
   */
  @Column({ name: 'target_value', type: 'decimal', precision: 15, scale: 2, nullable: false })
  targetValue: number;

  /**
   * Current value
   */
  @Column({ name: 'current_value', type: 'decimal', precision: 15, scale: 2, nullable: false, default: 0 })
  currentValue: number;

  /**
   * Starting value (baseline)
   */
  @Column({ name: 'starting_value', type: 'decimal', precision: 15, scale: 2, nullable: false, default: 0 })
  startingValue: number;

  /**
   * Unit of measurement (e.g., "%", "users", "$", "hours")
   */
  @Column({ name: 'unit', type: 'varchar', length: 32, nullable: true })
  unit: string | null;

  /**
   * Progress percentage (calculated: (current - starting) / (target - starting) * 100)
   */
  @Column({ name: 'progress_percentage', type: 'decimal', precision: 5, scale: 2, nullable: false, default: 0 })
  progressPercentage: number;

  /**
   * Last updated date
   */
  @Column({ name: 'last_updated_date', type: 'date', nullable: true })
  lastUpdatedDate: Date | null;

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
   * Check-in history (JSON array of check-in objects)
   */
  @Column({ name: 'check_in_history', type: 'jsonb', nullable: true })
  checkInHistory: Array<{
    id: string;
    date: string;
    value: number;
    notes?: string;
    updatedBy: number;
  }> | null;

  /**
   * Key result metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'key_result_metadata', type: 'jsonb', nullable: true })
  keyResultMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
