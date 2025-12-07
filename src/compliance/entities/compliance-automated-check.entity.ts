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
import { ComplianceRequirement } from './compliance-requirement.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Check Type Enum
 */
export enum CheckType {
  SQL_QUERY = 'SQL_QUERY',
  API_CALL = 'API_CALL',
  FILE_CHECK = 'FILE_CHECK',
  CONFIG_CHECK = 'CONFIG_CHECK',
  LOG_ANALYSIS = 'LOG_ANALYSIS',
}

/**
 * Execution Frequency Enum
 */
export enum ExecutionFrequency {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  ON_DEMAND = 'ON_DEMAND',
}

/**
 * Check Result Enum
 */
export enum CheckResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

/**
 * Compliance Automated Check Entity
 * 
 * Automated compliance checks and validations.
 */
@Entity('compliance_automated_checks')
@Index('idx_automated_checks_requirement', ['requirementId'])
@Index('idx_automated_checks_active', ['isActive'])
@Index('idx_automated_checks_enabled', ['isEnabled'])
@Index('idx_automated_checks_next_execution', ['nextExecutionAt'])
@Index('idx_automated_checks_last_result', ['lastResult'])
export class ComplianceAutomatedCheck {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'check_key', type: 'varchar', length: 128, unique: true, nullable: false })
  checkKey: string;

  @ManyToOne(() => ComplianceRequirement, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'requirement_id' })
  requirement: Promise<ComplianceRequirement> | ComplianceRequirement;

  @Column({ name: 'requirement_id', type: 'bigint', nullable: false })
  requirementId: number;

  @Column({ name: 'check_name', type: 'varchar', length: 255, nullable: false })
  checkName: string;

  @Column({ name: 'check_description', type: 'text', nullable: true })
  checkDescription: string | null;

  @Column({ name: 'check_type', type: 'varchar', length: 64, nullable: false })
  checkType: CheckType;

  @Column({ name: 'check_script', type: 'text', nullable: true })
  checkScript: string | null;

  @Column({ name: 'check_configuration', type: 'jsonb', nullable: true })
  checkConfiguration: Record<string, any> | null;

  @Column({ name: 'execution_frequency', type: 'varchar', length: 64, nullable: false, default: ExecutionFrequency.DAILY })
  executionFrequency: ExecutionFrequency;

  @Column({ name: 'last_executed_at', type: 'timestamptz', nullable: true })
  lastExecutedAt: Date | null;

  @Column({ name: 'next_execution_at', type: 'timestamptz', nullable: true })
  nextExecutionAt: Date | null;

  @Column({ name: 'execution_count', type: 'integer', nullable: false, default: 0 })
  executionCount: number;

  @Column({ name: 'last_result', type: 'varchar', length: 32, nullable: true })
  lastResult: CheckResult | null;

  @Column({ name: 'last_result_message', type: 'text', nullable: true })
  lastResultMessage: string | null;

  @Column({ name: 'last_result_details', type: 'jsonb', nullable: true })
  lastResultDetails: Record<string, any> | null;

  @Column({ name: 'last_execution_duration_ms', type: 'integer', nullable: true })
  lastExecutionDurationMs: number | null;

  @Column({ name: 'pass_threshold', type: 'decimal', precision: 5, scale: 2, nullable: true })
  passThreshold: number | null;

  @Column({ name: 'warning_threshold', type: 'decimal', precision: 5, scale: 2, nullable: true })
  warningThreshold: number | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @Column({ name: 'is_enabled', type: 'boolean', nullable: false, default: true })
  isEnabled: boolean;

  @Column({ name: 'notify_on_failure', type: 'boolean', nullable: false, default: true })
  notifyOnFailure: boolean;

  @Column({ name: 'notify_recipients', type: 'jsonb', nullable: true })
  notifyRecipients: number[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'created_by' })
  createdBy: Promise<User> | User | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: Promise<User> | User | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedById: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
