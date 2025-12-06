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
import { Employee } from '../../employees/entities/employee.entity';

/**
 * Leave Request Status Enum
 */
export enum LeaveRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

/**
 * Leave Request Entity - Represents employee leave requests
 * 
 * Leave requests support:
 * - Employee relationship
 * - Start and end dates
 * - Leave type (to be linked in future commits)
 * - Approval workflow (status, approver, approval date)
 * - Number of days calculation
 * - Reason/notes
 * - Organization context (via employee)
 * 
 * This is the foundation entity for the leave management system.
 * Future enhancements will include:
 * - Leave type relationship
 * - Multi-level approval workflow
 * - Leave balance validation
 * - Overlapping leave detection
 */
@Entity('leave_requests')
@Index('idx_leave_requests_employee', ['employeeId'])
@Index('idx_leave_requests_status', ['status'])
@Index('idx_leave_requests_dates', ['startDate', 'endDate'])
@Index('idx_leave_requests_organization', ['organizationId'])
@Index('idx_leave_requests_created', ['createdAt'])
export class LeaveRequest {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Employee requesting leave
   */
  @ManyToOne(() => Employee, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ name: 'employee_id', type: 'bigint', nullable: false })
  employeeId: number;

  /**
   * Organization ID (denormalized for easier querying)
   * This is the organization the employee belongs to
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  /**
   * Leave start date
   */
  @Column({ name: 'start_date', type: 'date', nullable: false })
  startDate: Date;

  /**
   * Leave end date (inclusive)
   */
  @Column({ name: 'end_date', type: 'date', nullable: false })
  endDate: Date;

  /**
   * Number of days requested
   * This will be calculated based on start and end dates
   * and can account for weekends/holidays in future
   */
  @Column({ name: 'number_of_days', type: 'decimal', precision: 5, scale: 2, nullable: true })
  numberOfDays: number | null;

  /**
   * Leave type ID (to be linked in future commits)
   * For now, we'll use a string type field as fallback
   */
  @Column({ name: 'leave_type_id', type: 'bigint', nullable: true })
  leaveTypeId: number | null;

  /**
   * Leave type name (legacy/fallback field)
   * This will be replaced by leaveTypeId relationship in future
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  type: string | null;

  /**
   * Leave request status
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: LeaveRequestStatus.PENDING,
  })
  status: LeaveRequestStatus;

  /**
   * Reason for leave request
   */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  /**
   * Additional notes/comments
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /**
   * User ID who approved/rejected the request
   */
  @Column({ name: 'approved_by', type: 'bigint', nullable: true })
  approvedBy: number | null;

  /**
   * Approval/rejection date
   */
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  /**
   * Rejection reason (if rejected)
   */
  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  /**
   * Request metadata (JSONB for additional flexible data)
   * Can store workflow state, approval chain, etc.
   */
  @Column({ name: 'request_metadata', type: 'jsonb', nullable: true })
  requestMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if leave request is pending
   */
  isPending(): boolean {
    return this.status === LeaveRequestStatus.PENDING;
  }

  /**
   * Check if leave request is approved
   */
  isApproved(): boolean {
    return this.status === LeaveRequestStatus.APPROVED;
  }

  /**
   * Check if leave request is rejected
   */
  isRejected(): boolean {
    return this.status === LeaveRequestStatus.REJECTED;
  }

  /**
   * Check if leave request is cancelled
   */
  isCancelled(): boolean {
    return this.status === LeaveRequestStatus.CANCELLED;
  }

  /**
   * Check if leave request is in a final state (not pending)
   */
  isFinal(): boolean {
    return this.status !== LeaveRequestStatus.PENDING;
  }

  /**
   * Calculate number of days between start and end date
   * This is a simple calculation - future enhancements will account for:
   * - Weekends
   * - Holidays
   * - Working days only
   */
  calculateDays(): number {
    if (!this.startDate || !this.endDate) {
      return 0;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates

    return diffDays;
  }

  /**
   * Check if a given date falls within this leave request period
   */
  includesDate(date: Date): boolean {
    const checkDate = new Date(date);
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    return checkDate >= start && checkDate <= end;
  }

  /**
   * Check if this leave request overlaps with another date range
   */
  overlapsWith(otherStartDate: Date, otherEndDate: Date): boolean {
    const thisStart = new Date(this.startDate);
    const thisEnd = new Date(this.endDate);
    const otherStart = new Date(otherStartDate);
    const otherEnd = new Date(otherEndDate);

    return (
      (thisStart <= otherEnd && thisEnd >= otherStart) ||
      (otherStart <= thisEnd && otherEnd >= thisStart)
    );
  }
}

