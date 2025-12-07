import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { CalendarEvent } from './calendar-event.entity';

/**
 * Attendee Status Enum
 */
export enum AttendeeStatus {
  PENDING = 'PENDING', // Invitation pending
  ACCEPTED = 'ACCEPTED', // Accepted
  DECLINED = 'DECLINED', // Declined
  TENTATIVE = 'TENTATIVE', // Tentative
  NO_RESPONSE = 'NO_RESPONSE', // No response
}

/**
 * Attendee Role Enum
 */
export enum AttendeeRole {
  ORGANIZER = 'ORGANIZER', // Event organizer
  REQUIRED = 'REQUIRED', // Required attendee
  OPTIONAL = 'OPTIONAL', // Optional attendee
}

/**
 * Calendar Event Attendee Entity
 * 
 * Multiple attendees for calendar events with response tracking.
 */
@Entity('calendar_event_attendees')
@Index('idx_event_attendees_event', ['eventId'])
@Index('idx_event_attendees_user', ['userId'])
@Index('idx_event_attendees_status', ['attendeeStatus'])
@Unique(['eventId', 'userId', 'email'])
export class CalendarEventAttendee {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Reference to calendar event
   */
  @Column({ name: 'event_id', type: 'bigint', nullable: false })
  eventId: number;

  /**
   * Event relationship
   */
  @ManyToOne(() => CalendarEvent, (event) => event.attendees, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: CalendarEvent;

  /**
   * User ID (if attendee is a user)
   */
  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: number | null;

  /**
   * Email address (for external attendees)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  /**
   * Display name
   */
  @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: true })
  displayName: string | null;

  /**
   * Attendee role
   */
  @Column({
    name: 'attendee_role',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: AttendeeRole.OPTIONAL,
  })
  attendeeRole: AttendeeRole;

  /**
   * Attendee status
   */
  @Column({
    name: 'attendee_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: AttendeeStatus.PENDING,
  })
  attendeeStatus: AttendeeStatus;

  /**
   * Response date
   */
  @Column({ name: 'response_date', type: 'timestamptz', nullable: true })
  responseDate: Date | null;

  /**
   * Whether attendee is required
   */
  @Column({ name: 'is_required', type: 'boolean', nullable: false, default: false })
  isRequired: boolean;

  /**
   * Attendee metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'attendee_metadata', type: 'jsonb', nullable: true })
  attendeeMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}

