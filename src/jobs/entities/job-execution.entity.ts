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
import { JobQueue } from './job-queue.entity';

/**
 * Execution Status Enum
 */
export enum ExecutionStatus {
  STARTED = 'STARTED', // Execution started
  RUNNING = 'RUNNING', // Execution running
  COMPLETED = 'COMPLETED', // Execution completed successfully
  FAILED = 'FAILED', // Execution failed
  TIMEOUT = 'TIMEOUT', // Execution timed out
  CANCELLED = 'CANCELLED', // Execution was cancelled
}

/**
 * Job Execution Entity
 *
 * Job execution history:
 * - Execution tracking
 * - Start/end times
 * - Execution results
 * - Error logs
 */
@Entity('job_executions', { schema: 'admin' })
@Index('idx_job_executions_job', ['jobQueueId'])
@Index('idx_job_executions_status', ['status'])
@Index('idx_job_executions_started', ['startedAt'])
@Index('idx_job_executions_completed', ['completedAt'])
export class JobExecution {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Job queue this execution belongs to
   */
  @ManyToOne(() => JobQueue, (job) => job.executions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'job_queue_id' })
  jobQueue: JobQueue;

  @Column({ name: 'job_queue_id', type: 'bigint', nullable: false })
  jobQueueId: number;

  /**
   * Execution status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ExecutionStatus.STARTED,
  })
  status: ExecutionStatus;

  /**
   * Execution start time
   */
  @Column({ name: 'started_at', type: 'timestamptz', nullable: false })
  startedAt: Date;

  /**
   * Execution end time
   */
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  /**
   * Execution duration in milliseconds
   */
  @Column({ name: 'duration_ms', type: 'bigint', nullable: true })
  durationMs: number | null;

  /**
   * Execution result (JSON)
   */
  @Column({ name: 'result', type: 'jsonb', nullable: true })
  result: Record<string, any> | null;

  /**
   * Error message (if execution failed)
   */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  /**
   * Error stack trace (if execution failed)
   */
  @Column({ name: 'error_stack', type: 'text', nullable: true })
  errorStack: string | null;

  /**
   * Execution logs (JSON array of log entries)
   */
  @Column({ name: 'execution_logs', type: 'jsonb', nullable: true })
  executionLogs: Array<{ timestamp: Date; level: string; message: string }> | null;

  /**
   * Worker/processor identifier
   */
  @Column({ name: 'worker_id', type: 'varchar', length: 128, nullable: true })
  workerId: string | null;

  /**
   * Execution metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'execution_metadata', type: 'jsonb', nullable: true })
  executionMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;
}

