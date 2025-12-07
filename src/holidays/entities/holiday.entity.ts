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
import { HolidayCalendar } from './holiday-calendar.entity';

/**
 * Holiday Type Enum
 */
export enum HolidayType {
  PUBLIC = 'PUBLIC',         // Public holiday
  FEDERAL = 'FEDERAL',       // Federal holiday
  RELIGIOUS = 'RELIGIOUS',   // Religious holiday
  REGIONAL = 'REGIONAL',     // Regional holiday
  COMPANY = 'COMPANY',       // Company-specific holiday
  FLOATING = 'FLOATING',     // Floating holiday (employee chooses date)
}

/**
 * Weekday Enum for recurring holidays
 */
export enum Weekday {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

/**
 * Holiday Entity
 * 
 * Individual holidays with dates, types, recurrence, and observance rules.
 * Supports fixed dates, recurring holidays, floating holidays, and observance adjustments.
 */
@Entity('holidays')
@Index('idx_holidays_calendar', ['holidayCalendarId'])
@Index('idx_holidays_date', ['holidayDate'])
@Index('idx_holidays_observed_date', ['observedDate'])
@Index('idx_holidays_type', ['holidayType'])
@Index('idx_holidays_recurring', ['isRecurring'])
@Index('idx_holidays_active', ['isActive'])
@Index('idx_holidays_floating', ['isFloating'])
export class Holiday {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Reference to holiday calendar
   */
  @Column({ name: 'holiday_calendar_id', type: 'bigint', nullable: false })
  holidayCalendarId: number;

  /**
   * Holiday calendar relationship
   */
  @ManyToOne(() => HolidayCalendar, (calendar) => calendar.holidays, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'holiday_calendar_id' })
  holidayCalendar: HolidayCalendar;

  /**
   * Holiday name (e.g., "New Year's Day", "Independence Day")
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  /**
   * Holiday description
   */
  @Column({ type: 'varchar', length: 512, nullable: true })
  description: string | null;

  /**
   * Actual holiday date
   */
  @Column({ name: 'holiday_date', type: 'date', nullable: false })
  holidayDate: Date;

  /**
   * Date when holiday is observed (may differ from holiday_date)
   */
  @Column({ name: 'observed_date', type: 'date', nullable: true })
  observedDate: Date | null;

  /**
   * Holiday type
   */
  @Column({
    name: 'holiday_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: HolidayType.PUBLIC,
  })
  holidayType: HolidayType;

  /**
   * Whether this holiday recurs annually
   */
  @Column({ name: 'is_recurring', type: 'boolean', nullable: false, default: false })
  isRecurring: boolean;

  /**
   * Recurrence pattern (e.g., "ANNUAL", "FIRST_MONDAY", "LAST_FRIDAY")
   */
  @Column({ name: 'recurrence_pattern', type: 'varchar', length: 64, nullable: true })
  recurrencePattern: string | null;

  /**
   * Month for recurring holidays (1-12)
   */
  @Column({ name: 'recurrence_month', type: 'integer', nullable: true })
  recurrenceMonth: number | null;

  /**
   * Day of month for recurring holidays
   */
  @Column({ name: 'recurrence_day', type: 'integer', nullable: true })
  recurrenceDay: number | null;

  /**
   * Day of week for recurring holidays
   */
  @Column({
    name: 'recurrence_weekday',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  recurrenceWeekday: Weekday | null;

  /**
   * Week number (1-5, for "first Monday", "last Friday", etc.)
   */
  @Column({ name: 'recurrence_week', type: 'integer', nullable: true })
  recurrenceWeek: number | null;

  /**
   * Whether this is a floating holiday (employee chooses date)
   */
  @Column({ name: 'is_floating', type: 'boolean', nullable: false, default: false })
  isFloating: boolean;

  /**
   * Number of floating holidays allocated
   */
  @Column({ name: 'floating_allocation_days', type: 'integer', nullable: true })
  floatingAllocationDays: number | null;

  /**
   * Observance rule (e.g., "MOVE_TO_MONDAY", "MOVE_TO_FRIDAY", "OBSERVE_ON_WEEKEND")
   */
  @Column({ name: 'observance_rule', type: 'varchar', length: 32, nullable: true })
  observanceRule: string | null;

  /**
   * Whether holiday is observed (may differ from actual date)
   */
  @Column({ name: 'is_observed', type: 'boolean', nullable: false, default: true })
  isObserved: boolean;

  /**
   * Whether holiday is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Holiday metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'holiday_metadata', type: 'jsonb', nullable: true })
  holidayMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
