import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ObjectType, Field, Int, Float, registerEnumType } from '@nestjs/graphql';
import { Employee } from '../../employees/entities/employee.entity';
import { TimesheetPeriod } from './timesheet-period.entity';
import { TimesheetEntry } from './timesheet-entry.entity';

/**
 * Timesheet Status Enum
 */
export enum TimesheetStatus {
  DRAFT = 'DRAFT', // Draft - can be edited
  SUBMITTED = 'SUBMITTED', // Submitted for approval
  APPROVED = 'APPROVED', // Approved
  REJECTED = 'REJECTED', // Rejected (can be resubmitted after edits)
  LOCKED = 'LOCKED', // Locked - cannot be edited
}

registerEnumType(TimesheetStatus, { name: 'TimesheetStatus' });

/**
 * Timesheet Entity
 *
 * Groups time entries for a specific period.
 * Links employee, period, status, and totals.
 * Supports approval workflow integration.
 */
@ObjectType()
@Entity('timesheets')
@Index('idx_timesheets_employee', ['employeeId'])
@Index('idx_timesheets_period', ['periodId', 'periodStartDate'])
@Index('idx_timesheets_status', ['status'])
@Index('idx_timesheets_employee_period', ['employeeId', 'periodId', 'periodStartDate'], {
  unique: true,
})
@Index('idx_timesheets_organization', ['organizationId'])
export class Timesheet {
  @Field(() => Int)
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Employee this timesheet belongs to
   */
  @ManyToOne(() => Employee, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Field(() => Int)
  @Column({ name: 'employee_id', type: 'bigint', nullable: false })
  employeeId: number;

  /**
   * Timesheet period
   */
  @ManyToOne(() => TimesheetPeriod, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'period_id' })
  period: TimesheetPeriod;

  @Field(() => Int)
  @Column({ name: 'period_id', type: 'bigint', nullable: false })
  periodId: number;

  /**
   * Period start date
   */
  @Field(() => Date)
  @Column({ name: 'period_start_date', type: 'date', nullable: false })
  periodStartDate: Date;

  /**
   * Period end date
   */
  @Field(() => Date)
  @Column({ name: 'period_end_date', type: 'date', nullable: false })
  periodEndDate: Date;

  /**
   * Period number within the period type
   */
  @Field(() => Int, { nullable: true })
  @Column({ name: 'period_number', type: 'bigint', nullable: true })
  periodNumber: number | null;

  /**
   * Timesheet status
   */
  @Field(() => String)
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: TimesheetStatus.DRAFT,
  })
  status: TimesheetStatus;

  /**
   * Total hours
   */
  @Field(() => Float)
  @Column({
    name: 'total_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  totalHours: number;

  /**
   * Total billable hours
   */
  @Column({
    name: 'total_billable_hours',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  totalBillableHours: number;

  /**
   * Total billing amount
   */
  @Column({
    name: 'total_billing_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  totalBillingAmount: number;

  /**
   * Total cost amount
   */
  @Column({
    name: 'total_cost_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
  })
  totalCostAmount: number;

  /**
   * Organization ID (for organization-scoped timesheets)
   */
  @Field(() => Int, { nullable: true })
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * When timesheet was submitted
   */
  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  /**
   * User who submitted the timesheet
   */
  @Column({ name: 'submitted_by', type: 'bigint', nullable: true })
  submittedBy: number | null;

  /**
   * User who approved the timesheet
   */
  @Column({ name: 'approved_by', type: 'bigint', nullable: true })
  approvedBy: number | null;

  /**
   * When timesheet was approved
   */
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  /**
   * User who rejected the timesheet
   */
  @Column({ name: 'rejected_by', type: 'bigint', nullable: true })
  rejectedBy: number | null;

  /**
   * When timesheet was rejected
   */
  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt: Date | null;

  /**
   * Rejection reason
   */
  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  /**
   * Whether timesheet is locked (cannot be edited)
   */
  @Column({ name: 'is_locked', type: 'boolean', nullable: false, default: false })
  isLocked: boolean;

  /**
   * Lock reason
   */
  @Column({ name: 'lock_reason', type: 'varchar', length: 255, nullable: true })
  lockReason: string | null;

  /**
   * When timesheet was locked
   */
  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt: Date | null;

  /**
   * User who locked the timesheet
   */
  @Column({ name: 'locked_by', type: 'bigint', nullable: true })
  lockedBy: number | null;

  /**
   * Notes
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /**
   * Workflow instance ID (for approval workflow integration)
   */
  @Column({ name: 'workflow_instance_id', type: 'bigint', nullable: true })
  workflowInstanceId: number | null;

  /**
   * Timesheet entries (manual entries)
   */
  @OneToMany(() => TimesheetEntry, (entry) => entry.timesheet, {
    cascade: true,
    lazy: true,
  })
  entries: Promise<TimesheetEntry[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if timesheet can be edited
   */
  canBeEdited(): boolean {
    return (
      !this.isLocked &&
      (this.status === TimesheetStatus.DRAFT || this.status === TimesheetStatus.REJECTED)
    );
  }

  /**
   * Check if timesheet is submitted
   */
  isSubmitted(): boolean {
    return this.status === TimesheetStatus.SUBMITTED;
  }

  /**
   * Check if timesheet is approved
   */
  isApproved(): boolean {
    return this.status === TimesheetStatus.APPROVED;
  }
}
