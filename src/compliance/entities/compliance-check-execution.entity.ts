import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ComplianceAutomatedCheck } from './compliance-automated-check.entity';

/**
 * Execution Status Enum
 */
export enum ExecutionStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Execution Result Enum
 */
export enum ExecutionResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

/**
 * Compliance Check Execution Entity
 *
 * Execution history for automated compliance checks.
 */
@Entity('compliance_check_executions')
@Index('idx_check_executions_check', ['checkId'])
@Index('idx_check_executions_status', ['executionStatus'])
@Index('idx_check_executions_result', ['executionResult'])
@Index('idx_check_executions_started', ['startedAt'])
export class ComplianceCheckExecution {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ManyToOne(() => ComplianceAutomatedCheck, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'check_id' })
  check: Promise<ComplianceAutomatedCheck> | ComplianceAutomatedCheck;

  @Column({ name: 'check_id', type: 'bigint', nullable: false })
  checkId: number;

  @Column({ name: 'execution_status', type: 'varchar', length: 32, nullable: false })
  executionStatus: ExecutionStatus;

  @Column({ name: 'execution_result', type: 'varchar', length: 32, nullable: true })
  executionResult: ExecutionResult | null;

  @Column({ name: 'execution_message', type: 'text', nullable: true })
  executionMessage: string | null;

  @Column({ name: 'execution_details', type: 'jsonb', nullable: true })
  executionDetails: Record<string, any> | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: false })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;
}

