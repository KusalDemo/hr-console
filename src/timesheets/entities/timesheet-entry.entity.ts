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
import { Timesheet } from './timesheet.entity';

/**
 * Timesheet Entry Entity
 * 
 * Manual time entries within a timesheet.
 * Used for manual time entry or corrections.
 */
@Entity('timesheet_entries')
@Index('idx_timesheet_entries_timesheet', ['timesheetId'])
@Index('idx_timesheet_entries_date', ['entryDate'])
export class TimesheetEntry {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Timesheet this entry belongs to
   */
  @ManyToOne(() => Timesheet, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'timesheet_id' })
  timesheet: Timesheet;

  @Column({ name: 'timesheet_id', type: 'bigint', nullable: false })
  timesheetId: number;

  /**
   * Entry date
   */
  @Column({ name: 'entry_date', type: 'date', nullable: false })
  entryDate: Date;

  /**
   * Hours worked
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  hours: number;

  /**
   * Whether entry is billable
   */
  @Column({ type: 'boolean', nullable: false, default: false })
  billable: boolean;

  /**
   * Project ID (if applicable)
   */
  @Column({ name: 'project_id', type: 'bigint', nullable: true })
  projectId: number | null;

  /**
   * Task ID (if applicable)
   */
  @Column({ name: 'task_id', type: 'bigint', nullable: true })
  taskId: number | null;

  /**
   * Description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Billing rate (if billable)
   */
  @Column({ name: 'billing_rate', type: 'decimal', precision: 10, scale: 2, nullable: true })
  billingRate: number | null;

  /**
   * Billing amount
   */
  @Column({ name: 'billing_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  billingAmount: number | null;

  /**
   * Cost rate
   */
  @Column({ name: 'cost_rate', type: 'decimal', precision: 10, scale: 2, nullable: true })
  costRate: number | null;

  /**
   * Cost amount
   */
  @Column({ name: 'cost_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  costAmount: number | null;

  /**
   * Additional metadata
   */
  @Column({ name: 'entry_metadata', type: 'jsonb', nullable: true })
  entryMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}


