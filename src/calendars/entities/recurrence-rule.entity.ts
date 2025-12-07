import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CalendarEvent } from './calendar-event.entity';

/**
 * Recurrence Frequency Enum
 */
export enum RecurrenceFrequency {
  DAILY = 'DAILY', // Daily
  WEEKLY = 'WEEKLY', // Weekly
  MONTHLY = 'MONTHLY', // Monthly
  YEARLY = 'YEARLY', // Yearly
}

/**
 * Recurrence Rule Entity
 *
 * Recurrence rules for recurring calendar events with complex patterns.
 */
@Entity('recurrence_rules')
@Index('idx_recurrence_rules_frequency', ['frequency'])
export class RecurrenceRule {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Recurrence frequency
   */
  @Column({
    name: 'frequency',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: RecurrenceFrequency.DAILY,
  })
  frequency: RecurrenceFrequency;

  /**
   * Interval (every N days/weeks/months/years)
   */
  @Column({ name: 'interval', type: 'integer', nullable: false, default: 1 })
  interval: number;

  /**
   * Count (number of occurrences, null for infinite)
   */
  @Column({ name: 'count', type: 'integer', nullable: true })
  count: number | null;

  /**
   * Until date (end date for recurrence, null for infinite)
   */
  @Column({ name: 'until_date', type: 'date', nullable: true })
  untilDate: Date | null;

  /**
   * By day (days of week for weekly/monthly recurrence, stored as JSON array)
   * e.g., ["MO", "WE", "FR"] for Monday, Wednesday, Friday
   */
  @Column({ name: 'by_day', type: 'text', nullable: true })
  byDay: string | null; // JSON array

  /**
   * By month day (days of month for monthly recurrence, stored as JSON array)
   * e.g., [1, 15] for 1st and 15th of month
   */
  @Column({ name: 'by_month_day', type: 'text', nullable: true })
  byMonthDay: string | null; // JSON array

  /**
   * By month (months for yearly recurrence, stored as JSON array)
   * e.g., [1, 6, 12] for January, June, December
   */
  @Column({ name: 'by_month', type: 'text', nullable: true })
  byMonth: string | null; // JSON array

  /**
   * By week number (week numbers for yearly recurrence, stored as JSON array)
   */
  @Column({ name: 'by_week_number', type: 'text', nullable: true })
  byWeekNumber: string | null; // JSON array

  /**
   * By year day (days of year for yearly recurrence, stored as JSON array)
   */
  @Column({ name: 'by_year_day', type: 'text', nullable: true })
  byYearDay: string | null; // JSON array

  /**
   * Week start (day of week week starts, e.g., "MO" for Monday)
   */
  @Column({ name: 'week_start', type: 'varchar', length: 2, nullable: true, default: 'MO' })
  weekStart: string | null;

  /**
   * Recurrence rule metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'recurrence_metadata', type: 'jsonb', nullable: true })
  recurrenceMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
