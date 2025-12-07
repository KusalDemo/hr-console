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
import { Calendar } from './calendar.entity';
import { CalendarEventAttendee } from './calendar-event-attendee.entity';
import { RecurrenceRule } from './recurrence-rule.entity';

/**
 * Event Status Enum
 */
export enum EventStatus {
  TENTATIVE = 'TENTATIVE', // Tentative
  CONFIRMED = 'CONFIRMED', // Confirmed
  CANCELLED = 'CANCELLED', // Cancelled
}

/**
 * Event Type Enum
 */
export enum EventType {
  MEETING = 'MEETING', // Meeting
  APPOINTMENT = 'APPOINTMENT', // Appointment
  TASK = 'TASK', // Task/Reminder
  HOLIDAY = 'HOLIDAY', // Holiday
  ALL_DAY = 'ALL_DAY', // All-day event
  OTHER = 'OTHER', // Other
}

/**
 * Calendar Event Entity
 * 
 * Calendar events with attendees, recurrence, reminders, and timezone support.
 */
@Entity('calendar_events')
@Index('idx_calendar_events_calendar', ['calendarId'])
@Index('idx_calendar_events_start', ['startTime'])
@Index('idx_calendar_events_end', ['endTime'])
@Index('idx_calendar_events_status', ['eventStatus'])
@Index('idx_calendar_events_type', ['eventType'])
@Index('idx_calendar_events_organizer', ['organizerId'])
export class CalendarEvent {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Reference to calendar
   */
  @Column({ name: 'calendar_id', type: 'bigint', nullable: false })
  calendarId: number;

  /**
   * Calendar relationship
   */
  @ManyToOne(() => Calendar, (calendar) => calendar.events, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'calendar_id' })
  calendar: Calendar;

  /**
   * Event title
   */
  @Column({ name: 'event_title', type: 'varchar', length: 255, nullable: false })
  eventTitle: string;

  /**
   * Event description
   */
  @Column({ name: 'event_description', type: 'text', nullable: true })
  eventDescription: string | null;

  /**
   * Event location
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  /**
   * Start time (TIMESTAMPTZ for timezone support)
   */
  @Column({ name: 'start_time', type: 'timestamptz', nullable: false })
  startTime: Date;

  /**
   * End time (TIMESTAMPTZ for timezone support)
   */
  @Column({ name: 'end_time', type: 'timestamptz', nullable: false })
  endTime: Date;

  /**
   * Whether event is all-day
   */
  @Column({ name: 'is_all_day', type: 'boolean', nullable: false, default: false })
  isAllDay: boolean;

  /**
   * Event timezone (IANA timezone identifier)
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  timezone: string | null;

  /**
   * Event type
   */
  @Column({
    name: 'event_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: EventType.OTHER,
  })
  eventType: EventType;

  /**
   * Event status
   */
  @Column({
    name: 'event_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: EventStatus.CONFIRMED,
  })
  eventStatus: EventStatus;

  /**
   * Organizer ID (user ID)
   */
  @Column({ name: 'organizer_id', type: 'bigint', nullable: false })
  organizerId: number;

  /**
   * Whether event is recurring
   */
  @Column({ name: 'is_recurring', type: 'boolean', nullable: false, default: false })
  isRecurring: boolean;

  /**
   * Recurrence rule ID (if recurring)
   */
  @Column({ name: 'recurrence_rule_id', type: 'bigint', nullable: true })
  recurrenceRuleId: number | null;

  /**
   * Recurrence rule relationship
   */
  @ManyToOne(() => RecurrenceRule, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recurrence_rule_id' })
  recurrenceRule: RecurrenceRule | null;

  /**
   * Parent event ID (for recurring event instances)
   */
  @Column({ name: 'parent_event_id', type: 'bigint', nullable: true })
  parentEventId: number | null;

  /**
   * Reminder minutes before event (array stored as JSON)
   */
  @Column({ name: 'reminder_minutes', type: 'text', nullable: true })
  reminderMinutes: string | null; // JSON array of minutes, e.g., [15, 60]

  /**
   * Whether reminders are sent
   */
  @Column({ name: 'reminders_sent', type: 'boolean', nullable: false, default: false })
  remindersSent: boolean;

  /**
   * Event URL (for virtual meetings)
   */
  @Column({ name: 'event_url', type: 'text', nullable: true })
  eventUrl: string | null;

  /**
   * Meeting notes
   */
  @Column({ name: 'meeting_notes', type: 'text', nullable: true })
  meetingNotes: string | null;

  /**
   * Event metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'event_metadata', type: 'jsonb', nullable: true })
  eventMetadata: Record<string, any> | null;

  /**
   * Calendar event attendees
   */
  @OneToMany(() => CalendarEventAttendee, (attendee) => attendee.event, {
    cascade: true,
    lazy: true,
  })
  attendees: Promise<CalendarEventAttendee[]> | CalendarEventAttendee[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if event is currently happening
   */
  isCurrentlyHappening(): boolean {
    const now = new Date();
    return now >= this.startTime && now <= this.endTime;
  }

  /**
   * Check if event is in the past
   */
  isPast(): boolean {
    return new Date() > this.endTime;
  }

  /**
   * Check if event is in the future
   */
  isFuture(): boolean {
    return new Date() < this.startTime;
  }
}

