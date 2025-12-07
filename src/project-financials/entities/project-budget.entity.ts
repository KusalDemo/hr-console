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
import { Project } from '../../projects/entities/project.entity';

/**
 * Budget Category Enum
 */
export enum BudgetCategory {
  LABOR = 'LABOR', // Labor costs
  MATERIALS = 'MATERIALS', // Materials and supplies
  EQUIPMENT = 'EQUIPMENT', // Equipment and tools
  TRAVEL = 'TRAVEL', // Travel expenses
  OVERHEAD = 'OVERHEAD', // Overhead costs
  SUBCONTRACTOR = 'SUBCONTRACTOR', // Subcontractor costs
  SOFTWARE = 'SOFTWARE', // Software licenses
  TRAINING = 'TRAINING', // Training costs
  OTHER = 'OTHER', // Other expenses
}

/**
 * Budget Status Enum
 */
export enum BudgetStatus {
  DRAFT = 'DRAFT', // Draft budget
  APPROVED = 'APPROVED', // Approved budget
  REVISED = 'REVISED', // Revised budget
  LOCKED = 'LOCKED', // Locked budget (cannot be modified)
}

/**
 * Project Budget Entity
 *
 * Represents budget lines for a project with categories.
 * Supports multiple budget versions and revisions.
 */
@Entity('project_budgets')
@Index('idx_project_budgets_project', ['projectId'])
@Index('idx_project_budgets_category', ['category'])
@Index('idx_project_budgets_status', ['status'])
@Index('idx_project_budgets_version', ['projectId', 'version'])
export class ProjectBudget {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Project this budget belongs to
   */
  @ManyToOne(() => Project, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id', type: 'bigint', nullable: false })
  projectId: number;

  /**
   * Budget version (for tracking revisions)
   */
  @Column({ type: 'integer', nullable: false, default: 1 })
  version: number;

  /**
   * Budget line name/description
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  /**
   * Budget category
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: BudgetCategory.OTHER,
  })
  category: BudgetCategory;

  /**
   * Budgeted amount
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
   * Actual cost amount (calculated from project_costs)
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
   * Committed amount (approved but not yet spent)
   */
  @Column({
    name: 'committed_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  committedAmount: number;

  /**
   * Budget status
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: BudgetStatus.DRAFT,
  })
  status: BudgetStatus;

  /**
   * Budget period start date
   */
  @Column({ name: 'period_start_date', type: 'date', nullable: true })
  periodStartDate: Date | null;

  /**
   * Budget period end date
   */
  @Column({ name: 'period_end_date', type: 'date', nullable: true })
  periodEndDate: Date | null;

  /**
   * Notes/description
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /**
   * Budget metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'budget_metadata', type: 'jsonb', nullable: true })
  budgetMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Calculate budget variance
   */
  getVariance(): number {
    return this.actualCostAmount - this.budgetedAmount;
  }

  /**
   * Calculate budget variance percentage
   */
  getVariancePercentage(): number {
    if (this.budgetedAmount === 0) {
      return 0;
    }

    return ((this.actualCostAmount - this.budgetedAmount) / this.budgetedAmount) * 100;
  }

  /**
   * Calculate available budget (budgeted - actual - committed)
   */
  getAvailableBudget(): number {
    return this.budgetedAmount - this.actualCostAmount - this.committedAmount;
  }

  /**
   * Check if budget is over budget
   */
  isOverBudget(): boolean {
    return this.actualCostAmount > this.budgetedAmount;
  }

  /**
   * Check if budget is at risk (committed + actual approaching budget)
   */
  isAtRisk(): boolean {
    const total = this.actualCostAmount + this.committedAmount;
    return total > this.budgetedAmount * 0.9; // 90% threshold
  }
}

