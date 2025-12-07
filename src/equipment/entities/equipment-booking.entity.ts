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
import { Equipment } from './equipment.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { WorkflowInstance } from '../../workflows/entities/workflow-instance.entity';

/**
 * Booking Status Enum
 */
export enum BookingStatus {
  PENDING = 'PENDING', // Pending approval
  APPROVED = 'APPROVED', // Approved, ready to use
  REJECTED = 'REJECTED', // Rejected
  ACTIVE = 'ACTIVE', // Currently in use
  COMPLETED = 'COMPLETED', // Returned/completed
  CANCELLED = 'CANCELLED', // Cancelled by user or admin
}

/**
 * Equipment Booking Entity
 *
 * Shared equipment booking system with approval workflows.
 * Supports reservations, conflict detection, usage analytics, and return tracking.
 */
@Entity('equipment_bookings')
@Index('idx_equipment_bookings_equipment', ['equipmentId'])
@Index('idx_equipment_bookings_employee', ['employeeId'])
@Index('idx_equipment_bookings_status', ['bookingStatus'])
@Index('idx_equipment_bookings_dates', ['startDate', 'endDate'])
@Index('idx_equipment_bookings_active', ['bookingStatus', 'startDate', 'endDate'])
@Index('idx_equipment_bookings_workflow', ['workflowInstanceId'])
@Index('idx_equipment_bookings_organization', ['organizationId'])
export class EquipmentBooking {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Reference to equipment
   */
  @Column({ name: 'equipment_id', type: 'bigint', nullable: false })
  equipmentId: number;

  /**
   * Equipment relationship
   */
  @ManyToOne(() => Equipment, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  /**
   * Employee who booked the equipment
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
   * Organization ID
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  /**
   * Booking status
   */
  @Column({
    name: 'booking_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: BookingStatus.PENDING,
  })
  bookingStatus: BookingStatus;

  /**
   * Start date/time of booking
   */
  @Column({ name: 'start_date', type: 'timestamptz', nullable: false })
  startDate: Date;

  /**
   * End date/time of booking
   */
  @Column({ name: 'end_date', type: 'timestamptz', nullable: false })
  endDate: Date;

  /**
   * Actual pickup date/time
   */
  @Column({ name: 'actual_pickup_date', type: 'timestamptz', nullable: true })
  actualPickupDate: Date | null;

  /**
   * Actual return date/time
   */
  @Column({ name: 'actual_return_date', type: 'timestamptz', nullable: true })
  actualReturnDate: Date | null;

  /**
   * Booking purpose/description
   */
  @Column({ name: 'booking_purpose', type: 'text', nullable: true })
  bookingPurpose: string | null;

  /**
   * Booking notes
   */
  @Column({ name: 'booking_notes', type: 'text', nullable: true })
  bookingNotes: string | null;

  /**
   * Return notes (condition, issues, etc.)
   */
  @Column({ name: 'return_notes', type: 'text', nullable: true })
  returnNotes: string | null;

  /**
   * Condition at pickup
   */
  @Column({ name: 'condition_at_pickup', type: 'varchar', length: 64, nullable: true })
  conditionAtPickup: string | null;

  /**
   * Condition at return
   */
  @Column({ name: 'condition_at_return', type: 'varchar', length: 64, nullable: true })
  conditionAtReturn: string | null;

  /**
   * Workflow instance ID for approval workflow
   */
  @Column({ name: 'workflow_instance_id', type: 'bigint', nullable: true })
  workflowInstanceId: number | null;

  /**
   * Workflow instance relationship
   */
  @ManyToOne(() => WorkflowInstance, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'workflow_instance_id' })
  workflowInstance: WorkflowInstance | null;

  /**
   * Approved by user ID
   */
  @Column({ name: 'approved_by_id', type: 'bigint', nullable: true })
  approvedById: number | null;

  /**
   * Approval date
   */
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  /**
   * Rejected by user ID
   */
  @Column({ name: 'rejected_by_id', type: 'bigint', nullable: true })
  rejectedById: number | null;

  /**
   * Rejection date
   */
  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt: Date | null;

  /**
   * Rejection reason
   */
  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  /**
   * Cancelled by user ID
   */
  @Column({ name: 'cancelled_by_id', type: 'bigint', nullable: true })
  cancelledById: number | null;

  /**
   * Cancellation date
   */
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  /**
   * Cancellation reason
   */
  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null;

  /**
   * Usage hours (calculated from actual pickup/return)
   */
  @Column({ name: 'usage_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
  usageHours: number | null;

  /**
   * Usage analytics metadata (JSONB for flexible analytics data)
   */
  @Column({ name: 'usage_analytics', type: 'jsonb', nullable: true })
  usageAnalytics: Record<string, any> | null;

  /**
   * Booking metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'booking_metadata', type: 'jsonb', nullable: true })
  bookingMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
