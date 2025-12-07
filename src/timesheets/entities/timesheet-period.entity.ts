import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Timesheet } from './timesheet.entity';

/**
 * Period Type Enum
 */
export enum PeriodType {
  WEEKLY = 'WEEKLY', // 7 days
  BI_WEEKLY = 'BI_WEEKLY', // 14 days
  SEMI_MONTHLY = 'SEMI_MONTHLY', // 15 days (twice per month)
  MONTHLY = 'MONTHLY', // Monthly
  CUSTOM = 'CUSTOM', // Custom number of days
}

/**
 * Timesheet Period Entity
 *
 * Defines recurring periods (weekly, bi-weekly, monthly, custom).
 * Used to group time entries into timesheets.
 */
@Entity('timesheet_periods')
@Index('idx_timesheet_periods_key', ['periodKey'], { unique: true })
@Index('idx_timesheet_periods_active', ['isActive'])
export class TimesheetPeriod {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique period key (e.g., "weekly", "biweekly", "monthly")
   */
  @Column({ name: 'period_key', type: 'varchar', length: 128, unique: true, nullable: false })
  periodKey: string;

  /**
   * Period name
   */
  @Column({ name: 'period_name', type: 'varchar', length: 255, nullable: false })
  periodName: string;

  /**
   * Period type
   */
  @Column({
    name: 'period_type',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  periodType: PeriodType;

  /**
   * Start date of first period
   */
  @Column({ name: 'start_date', type: 'date', nullable: false })
  startDate: Date;

  /**
   * Number of days in period (e.g., 7 for weekly)
   */
  @Column({ name: 'days_in_period', type: 'integer', nullable: false })
  daysInPeriod: number;

  /**
   * Whether period is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Period description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Organization ID (for organization-scoped periods)
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Timesheets using this period
   */
  @OneToMany(() => Timesheet, (timesheet) => timesheet.period, {
    cascade: false,
    lazy: true,
  })
  timesheets: Promise<Timesheet[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  /**
   * Calculate the period start date for a given date
   */
  getPeriodStartDate(date: Date): Date {
    const start = new Date(this.startDate);
    const target = new Date(date);
    const daysBetween = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const periodsPassed = Math.floor(daysBetween / this.daysInPeriod);
    const periodStart = new Date(start);
    periodStart.setDate(periodStart.getDate() + periodsPassed * this.daysInPeriod);
    return periodStart;
  }

  /**
   * Calculate the period end date for a given date
   */
  getPeriodEndDate(date: Date): Date {
    const periodStart = this.getPeriodStartDate(date);
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + this.daysInPeriod - 1);
    return periodEnd;
  }

  /**
   * Get the period number for a given date
   */
  getPeriodNumber(date: Date): number {
    const start = new Date(this.startDate);
    const target = new Date(date);
    const daysBetween = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor(daysBetween / this.daysInPeriod) + 1;
  }
}

