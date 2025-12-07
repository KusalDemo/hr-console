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
import { Project } from './project.entity';

/**
 * Phase Status Enum
 */
export enum PhaseStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
}

/**
 * Project Phase Entity
 * 
 * Represents phases within a project.
 * Supports sequential or parallel phases.
 */
@Entity('project_phases')
@Index('idx_project_phases_project', ['projectId'])
@Index('idx_project_phases_sequence', ['projectId', 'sequence'])
export class ProjectPhase {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Project this phase belongs to
   */
  @ManyToOne(() => Project, (project) => project.phases, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id', type: 'bigint', nullable: false })
  projectId: number;

  /**
   * Phase name
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  /**
   * Phase description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Phase sequence (order within project)
   */
  @Column({ type: 'integer', nullable: false, default: 1 })
  sequence: number;

  /**
   * Phase status
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: PhaseStatus.NOT_STARTED,
  })
  status: PhaseStatus;

  /**
   * Phase start date
   */
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  /**
   * Phase end date (planned)
   */
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  /**
   * Actual completion date
   */
  @Column({ name: 'actual_completion_date', type: 'date', nullable: true })
  actualCompletionDate: Date | null;

  /**
   * Budgeted amount for this phase
   */
  @Column({
    name: 'budgeted_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  budgetedAmount: number;

  /**
   * Actual cost amount for this phase
   */
  @Column({
    name: 'actual_cost_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  actualCostAmount: number;

  /**
   * Budgeted hours for this phase
   */
  @Column({
    name: 'budgeted_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  budgetedHours: number;

  /**
   * Actual hours for this phase
   */
  @Column({
    name: 'actual_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  actualHours: number;

  /**
   * Phase metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'phase_metadata', type: 'jsonb', nullable: true })
  phaseMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if phase is completed
   */
  isCompleted(): boolean {
    return this.status === PhaseStatus.COMPLETED;
  }

  /**
   * Check if phase is in progress
   */
  isInProgress(): boolean {
    return this.status === PhaseStatus.IN_PROGRESS;
  }

  /**
   * Calculate phase completion percentage
   */
  getCompletionPercentage(): number {
    if (this.budgetedHours === 0) {
      return this.isCompleted() ? 100 : 0;
    }

    return Math.min(100, (this.actualHours / this.budgetedHours) * 100);
  }
}


