import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { JobExecution } from './job-execution.entity';

/**
 * Job Type Enum
 */
export enum JobType {
  EMAIL = 'EMAIL', // Email sending job
  REPORT = 'REPORT', // Report generation job
  EXPORT = 'EXPORT', // Data export job
  IMPORT = 'IMPORT', // Data import job
  NOTIFICATION = 'NOTIFICATION', // Notification job
  WEBHOOK = 'WEBHOOK', // Webhook delivery job
  CALCULATION = 'CALCULATION', // Calculation job (KPI, etc.)
  CLEANUP = 'CLEANUP', // Cleanup job
  SYNC = 'SYNC', // Data synchronization job
  CUSTOM = 'CUSTOM', // Custom job
}

/**
 * Job Status Enum
 */
export enum JobStatus {
  PENDING = 'PENDING', // Job is pending execution
  QUEUED = 'QUEUED', // Job is queued
  RUNNING = 'RUNNING', // Job is currently running
  COMPLETED = 'COMPLETED', // Job completed successfully
  FAILED = 'FAILED', // Job failed
  CANCELLED = 'CANCELLED', // Job was cancelled
  RETRYING = 'RETRYING', // Job is being retried
}

/**
 * Job Priority Enum
 */
export enum JobPriority {
  LOW = 'LOW', // Low priority
  NORMAL = 'NORMAL', // Normal priority
  HIGH = 'HIGH', // High priority
  URGENT = 'URGENT', // Urgent priority
}

/**
 * Job Queue Entity
 *
 * Job definitions and status tracking:
 * - Job type and configuration
 * - Priority and scheduling
 * - Retry logic
 * - Dependencies
 * - Job monitoring
 */
@Entity('job_queues')
@Index('idx_job_queues_type', ['jobType'])
@Index('idx_job_queues_status', ['status'])
@Index('idx_job_queues_priority', ['priority'])
@Index('idx_job_queues_scheduled', ['scheduledAt'])
@Index('idx_job_queues_organization', ['organizationId'])
@Index('idx_job_queues_status_scheduled', ['status', 'scheduledAt'])
export class JobQueue {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Job type
   */
  @Column({
    name: 'job_type',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  jobType: JobType;

  /**
   * Job name/description
   */
  @Column({ name: 'job_name', type: 'varchar', length: 255, nullable: false })
  jobName: string;

  /**
   * Job description
   */
  @Column({ name: 'job_description', type: 'text', nullable: true })
  jobDescription: string | null;

  /**
   * Organization ID
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Job status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: JobStatus.PENDING,
  })
  status: JobStatus;

  /**
   * Job priority
   */
  @Column({
    name: 'priority',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: JobPriority.NORMAL,
  })
  priority: JobPriority;

  /**
   * Job payload/data (JSON)
   */
  @Column({ name: 'job_data', type: 'jsonb', nullable: false })
  jobData: Record<string, any>;

  /**
   * Scheduled execution time (null = immediate)
   */
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  /**
   * Job dependencies (array of job IDs that must complete first)
   */
  @Column({ name: 'dependencies', type: 'jsonb', nullable: true })
  dependencies: number[] | null;

  /**
   * Maximum retry attempts
   */
  @Column({ name: 'max_retries', type: 'integer', nullable: false, default: 3 })
  maxRetries: number;

  /**
   * Current retry count
   */
  @Column({ name: 'retry_count', type: 'integer', nullable: false, default: 0 })
  retryCount: number;

  /**
   * Retry delay in seconds
   */
  @Column({ name: 'retry_delay', type: 'integer', nullable: false, default: 60 })
  retryDelay: number;

  /**
   * Timeout in seconds (null = no timeout)
   */
  @Column({ name: 'timeout', type: 'integer', nullable: true })
  timeout: number | null;

  /**
   * Whether job is recurring
   */
  @Column({ name: 'is_recurring', type: 'boolean', nullable: false, default: false })
  isRecurring: boolean;

  /**
   * Cron expression for recurring jobs
   */
  @Column({ name: 'cron_expression', type: 'varchar', length: 128, nullable: true })
  cronExpression: string | null;

  /**
   * Next execution time (for recurring jobs)
   */
  @Column({ name: 'next_execution_at', type: 'timestamptz', nullable: true })
  nextExecutionAt: Date | null;

  /**
   * Last execution time
   */
  @Column({ name: 'last_execution_at', type: 'timestamptz', nullable: true })
  lastExecutionAt: Date | null;

  /**
   * Job metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'job_metadata', type: 'jsonb', nullable: true })
  jobMetadata: Record<string, any> | null;

  /**
   * Job executions
   */
  @OneToMany(() => JobExecution, (execution) => execution.jobQueue, {
    cascade: false,
    lazy: true,
  })
  executions: Promise<JobExecution[]> | JobExecution[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}

