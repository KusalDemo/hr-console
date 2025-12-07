import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { ReportDefinition } from './report-definition.entity';

/**
 * Schedule Frequency Enum
 */
export enum ScheduleFrequency {
  ONCE = 'ONCE', // Run once
  DAILY = 'DAILY', // Daily
  WEEKLY = 'WEEKLY', // Weekly
  MONTHLY = 'MONTHLY', // Monthly
  QUARTERLY = 'QUARTERLY', // Quarterly
  YEARLY = 'YEARLY', // Yearly
  CUSTOM = 'CUSTOM', // Custom cron expression
}

/**
 * Schedule Status Enum
 */
export enum ScheduleStatus {
  ACTIVE = 'ACTIVE', // Active schedule
  PAUSED = 'PAUSED', // Paused schedule
  COMPLETED = 'COMPLETED', // Completed (for one-time schedules)
  CANCELLED = 'CANCELLED', // Cancelled schedule
}

/**
 * Report Schedule Entity
 *
 * Scheduled report generation with:
 * - Frequency configuration
 * - Email delivery
 * - Execution history
 */
@Entity('report_schedules')
@Index('idx_report_schedules_report', ['reportDefinitionId'])
@Index('idx_report_schedules_status', ['status'])
@Index('idx_report_schedules_next_run', ['nextRunAt'])
@Index('idx_report_schedules_active', ['status', 'nextRunAt'])
export class ReportSchedule {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Report definition this schedule belongs to
   */
  @ManyToOne(() => ReportDefinition, (report) => report.schedules, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'report_definition_id' })
  reportDefinition: ReportDefinition;

  @Column({ name: 'report_definition_id', type: 'bigint', nullable: false })
  reportDefinitionId: number;

  /**
   * Schedule name
   */
  @Column({ name: 'schedule_name', type: 'varchar', length: 255, nullable: false })
  scheduleName: string;

  /**
   * Schedule description
   */
  @Column({ name: 'schedule_description', type: 'text', nullable: true })
  scheduleDescription: string | null;

  /**
   * Schedule frequency
   */
  @Column({
    name: 'frequency',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ScheduleFrequency.DAILY,
  })
  frequency: ScheduleFrequency;

  /**
   * Cron expression (for CUSTOM frequency)
   */
  @Column({ name: 'cron_expression', type: 'varchar', length: 128, nullable: true })
  cronExpression: string | null;

  /**
   * Schedule status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ScheduleStatus.ACTIVE,
  })
  status: ScheduleStatus;

  /**
   * Start date for schedule
   */
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  /**
   * End date for schedule (null = no end date)
   */
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  /**
   * Next run date/time
   */
  @Column({ name: 'next_run_at', type: 'timestamptz', nullable: true })
  nextRunAt: Date | null;

  /**
   * Last run date/time
   */
  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true })
  lastRunAt: Date | null;

  /**
   * Output format override (null = use report default)
   */
  @Column({
    name: 'output_format',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  outputFormat: string | null;

  /**
   * Email recipients (JSON array of email addresses)
   */
  @Column({ name: 'email_recipients', type: 'jsonb', nullable: true })
  emailRecipients: string[] | null;

  /**
   * Email subject override
   */
  @Column({ name: 'email_subject', type: 'varchar', length: 255, nullable: true })
  emailSubject: string | null;

  /**
   * Email body override
   */
  @Column({ name: 'email_body', type: 'text', nullable: true })
  emailBody: string | null;

  /**
   * Schedule configuration (JSON: timezone, day of week, day of month, etc.)
   */
  @Column({ name: 'schedule_config', type: 'jsonb', nullable: true })
  scheduleConfig: Record<string, any> | null;

  /**
   * Execution count
   */
  @Column({ name: 'execution_count', type: 'integer', nullable: false, default: 0 })
  executionCount: number;

  /**
   * Last execution status (success, error, etc.)
   */
  @Column({ name: 'last_execution_status', type: 'varchar', length: 32, nullable: true })
  lastExecutionStatus: string | null;

  /**
   * Last execution error message
   */
  @Column({ name: 'last_execution_error', type: 'text', nullable: true })
  lastExecutionError: string | null;

  /**
   * Schedule metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'schedule_metadata', type: 'jsonb', nullable: true })
  scheduleMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
