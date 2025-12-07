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
import { Resource } from './resource.entity';

/**
 * Booking Status Enum
 */
export enum BookingStatus {
  PENDING = 'PENDING', // Pending approval
  APPROVED = 'APPROVED', // Approved
  CONFIRMED = 'CONFIRMED', // Confirmed (no approval needed or auto-approved)
  CANCELLED = 'CANCELLED', // Cancelled
  REJECTED = 'REJECTED', // Rejected
  COMPLETED = 'COMPLETED', // Completed
  NO_SHOW = 'NO_SHOW', // No-show
}

/**
 * Resource Booking Entity
 * 
 * Resource bookings with conflict detection, approval workflows, and usage tracking.
 */
@Entity('resource_bookings')
@Index('idx_resource_bookings_resource', ['resourceId'])
@Index('idx_resource_bookings_user', ['bookedById'])
@Index('idx_resource_bookings_status', ['bookingStatus'])
@Index('idx_resource_bookings_start', ['startTime'])
@Index('idx_resource_bookings_end', ['endTime'])
@Index('idx_resource_bookings_organization', ['organizationId'])
@Index('idx_resource_bookings_calendar_event', ['calendarEventId'])
@Index('idx_resource_bookings_date_range', ['startTime', 'endTime'])
export class ResourceBooking {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Reference to resource
   */
  @Column({ name: 'resource_id', type: 'bigint', nullable: false })
  resourceId: number;

  /**
   * Resource relationship
   */
  @ManyToOne(() => Resource, (resource) => resource.bookings, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;

  /**
   * User who made the booking
   */
  @Column({ name: 'booked_by_id', type: 'bigint', nullable: false })
  bookedById: number;

  /**
   * Organization ID
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Booking title/description
   */
  @Column({ name: 'booking_title', type: 'varchar', length: 255, nullable: false })
  bookingTitle: string;

  /**
   * Booking description
   */
  @Column({ name: 'booking_description', type: 'text', nullable: true })
  bookingDescription: string | null;

  /**
   * Start time
   */
  @Column({ name: 'start_time', type: 'timestamptz', nullable: false })
  startTime: Date;

  /**
   * End time
   */
  @Column({ name: 'end_time', type: 'timestamptz', nullable: false })
  endTime: Date;

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
   * Whether booking has conflicts
   */
  @Column({ name: 'has_conflicts', type: 'boolean', nullable: false, default: false })
  hasConflicts: boolean;

  /**
   * Conflict details (JSON array of conflicting booking IDs)
   */
  @Column({ name: 'conflict_details', type: 'jsonb', nullable: true })
  conflictDetails: number[] | null;

  /**
   * Reference to calendar event (if booking is linked to a calendar event)
   */
  @Column({ name: 'calendar_event_id', type: 'bigint', nullable: true })
  calendarEventId: number | null;

  /**
   * Approver ID (who approved/rejected the booking)
   */
  @Column({ name: 'approver_id', type: 'bigint', nullable: true })
  approverId: number | null;

  /**
   * Approval/rejection reason
   */
  @Column({ name: 'approval_reason', type: 'text', nullable: true })
  approvalReason: string | null;

  /**
   * Approval timestamp
   */
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  /**
   * Number of attendees (for capacity checking)
   */
  @Column({ name: 'attendee_count', type: 'integer', nullable: true })
  attendeeCount: number | null;

  /**
   * Special requirements/notes
   */
  @Column({ name: 'special_requirements', type: 'text', nullable: true })
  specialRequirements: string | null;

  /**
   * Recurrence pattern (if recurring booking)
   */
  @Column({ name: 'recurrence_pattern', type: 'jsonb', nullable: true })
  recurrencePattern: Record<string, any> | null;

  /**
   * Whether booking is recurring
   */
  @Column({ name: 'is_recurring', type: 'boolean', nullable: false, default: false })
  isRecurring: boolean;

  /**
   * Parent booking ID (for recurring bookings)
   */
  @Column({ name: 'parent_booking_id', type: 'bigint', nullable: true })
  parentBookingId: number | null;

  /**
   * Cancellation reason
   */
  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null;

  /**
   * Cancelled by user ID
   */
  @Column({ name: 'cancelled_by_id', type: 'bigint', nullable: true })
  cancelledById: number | null;

  /**
   * Cancellation timestamp
   */
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  /**
   * Actual start time (if different from scheduled)
   */
  @Column({ name: 'actual_start_time', type: 'timestamptz', nullable: true })
  actualStartTime: Date | null;

  /**
   * Actual end time (if different from scheduled)
   */
  @Column({ name: 'actual_end_time', type: 'timestamptz', nullable: true })
  actualEndTime: Date | null;

  /**
   * Usage notes/feedback
   */
  @Column({ name: 'usage_notes', type: 'text', nullable: true })
  usageNotes: string | null;

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
