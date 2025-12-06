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
import { Employee } from '../../employees/entities/employee.entity';
import { Task } from '../../tasks/entities/task.entity';

/**
 * Cost Type Enum
 */
export enum CostType {
  LABOR = 'LABOR', // Labor costs (from time tracking)
  MATERIALS = 'MATERIALS', // Materials and supplies
  EQUIPMENT = 'EQUIPMENT', // Equipment rental/purchase
  TRAVEL = 'TRAVEL', // Travel expenses
  OVERHEAD = 'OVERHEAD', // Overhead allocation
  SUBCONTRACTOR = 'SUBCONTRACTOR', // Subcontractor costs
  SOFTWARE = 'SOFTWARE', // Software licenses
  TRAINING = 'TRAINING', // Training costs
  EXPENSE = 'EXPENSE', // General expenses
  OTHER = 'OTHER', // Other costs
}

/**
 * Cost Status Enum
 */
export enum CostStatus {
  PENDING = 'PENDING', // Pending approval
  APPROVED = 'APPROVED', // Approved
  INVOICED = 'INVOICED', // Invoiced to client
  PAID = 'PAID', // Paid
  REJECTED = 'REJECTED', // Rejected
}

/**
 * Project Cost Entity
 * 
 * Represents actual costs incurred for a project.
 * Supports labor costs (from time tracking), materials, expenses, etc.
 * Integration with time tracking for labor costs.
 */
@Entity('project_costs')
@Index('idx_project_costs_project', ['projectId'])
@Index('idx_project_costs_type', ['costType'])
@Index('idx_project_costs_status', ['status'])
@Index('idx_project_costs_date', ['costDate'])
@Index('idx_project_costs_employee', ['employeeId'])
@Index('idx_project_costs_task', ['taskId'])
@Index('idx_project_costs_budget', ['budgetLineId'])
export class ProjectCost {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Project this cost belongs to
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
   * Budget line this cost is associated with (optional)
   */
  @Column({ name: 'budget_line_id', type: 'bigint', nullable: true })
  budgetLineId: number | null;

  /**
   * Cost type
   */
  @Column({
    name: 'cost_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: CostType.OTHER,
  })
  costType: CostType;

  /**
   * Cost description
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  description: string;

  /**
   * Cost amount
   */
  @Column({
    name: 'cost_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  costAmount: number;

  /**
   * Cost date (when the cost was incurred)
   */
  @Column({ name: 'cost_date', type: 'date', nullable: false })
  costDate: Date;

  /**
   * Quantity (for unit-based costs)
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  quantity: number | null;

  /**
   * Unit price (for unit-based costs)
   */
  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  unitPrice: number | null;

  /**
   * Employee ID (for labor costs from time tracking)
   */
  @ManyToOne(() => Employee, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee | null;

  @Column({ name: 'employee_id', type: 'bigint', nullable: true })
  employeeId: number | null;

  /**
   * Hours (for labor costs)
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  hours: number | null;

  /**
   * Hourly rate (for labor costs)
   */
  @Column({
    name: 'hourly_rate',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  hourlyRate: number | null;

  /**
   * Task ID (if cost is associated with a specific task)
   */
  @ManyToOne(() => Task, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'task_id' })
  task: Task | null;

  @Column({ name: 'task_id', type: 'bigint', nullable: true })
  taskId: number | null;

  /**
   * Time entry ID (if cost comes from time tracking)
   */
  @Column({ name: 'time_entry_id', type: 'bigint', nullable: true })
  timeEntryId: number | null;

  /**
   * Vendor/Supplier name (for materials, subcontractors, etc.)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  vendor: string | null;

  /**
   * Invoice number (if applicable)
   */
  @Column({ name: 'invoice_number', type: 'varchar', length: 128, nullable: true })
  invoiceNumber: string | null;

  /**
   * Receipt/document reference
   */
  @Column({ name: 'receipt_reference', type: 'varchar', length: 255, nullable: true })
  receiptReference: string | null;

  /**
   * Cost status
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: CostStatus.PENDING,
  })
  status: CostStatus;

  /**
   * Whether this cost is billable to client
   */
  @Column({ name: 'is_billable', type: 'boolean', nullable: false, default: false })
  isBillable: boolean;

  /**
   * Billing rate (if billable, different from cost rate)
   */
  @Column({
    name: 'billing_rate',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  billingRate: number | null;

  /**
   * Billing amount (if billable)
   */
  @Column({
    name: 'billing_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  billingAmount: number | null;

  /**
   * Currency code (for multi-currency support - to be enhanced in Commit 32)
   */
  @Column({ type: 'varchar', length: 3, nullable: true, default: 'USD' })
  currency: string | null;

  /**
   * Cost metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'cost_metadata', type: 'jsonb', nullable: true })
  costMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Calculate profit margin (if billable)
   */
  getProfitMargin(): number | null {
    if (!this.isBillable || !this.billingAmount) {
      return null;
    }

    return this.billingAmount - this.costAmount;
  }

  /**
   * Calculate profit margin percentage (if billable)
   */
  getProfitMarginPercentage(): number | null {
    if (!this.isBillable || !this.billingAmount || this.billingAmount === 0) {
      return null;
    }

    return ((this.billingAmount - this.costAmount) / this.billingAmount) * 100;
  }

  /**
   * Check if cost is from time tracking
   */
  isFromTimeTracking(): boolean {
    return this.costType === CostType.LABOR && this.timeEntryId !== null;
  }
}

