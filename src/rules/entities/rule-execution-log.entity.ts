import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BusinessRule } from './business-rule.entity';

/**
 * Execution Status Enum
 */
export enum ExecutionStatus {
  SUCCESS = 'SUCCESS', // Rule executed successfully
  FAILED = 'FAILED', // Rule execution failed
  CONDITION_NOT_MET = 'CONDITION_NOT_MET', // Conditions did not match
  SKIPPED = 'SKIPPED', // Rule was skipped (e.g., stopOnMatch)
  ERROR = 'ERROR', // Error during execution
}

/**
 * Rule Execution Log Entity
 *
 * Audit trail of rule executions.
 * Tracks when rules were executed, their results, and any errors.
 */
@Entity('rule_execution_logs')
@Index('idx_rule_logs_rule', ['businessRuleId'])
@Index('idx_rule_logs_entity', ['entityType', 'entityId'])
@Index('idx_rule_logs_status', ['executionStatus'])
@Index('idx_rule_logs_created', ['createdAt'])
export class RuleExecutionLog {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Business rule that was executed
   */
  @ManyToOne(() => BusinessRule, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_rule_id' })
  businessRule: BusinessRule;

  @Column({ name: 'business_rule_id', type: 'bigint', nullable: false })
  businessRuleId: number;

  /**
   * Entity type that triggered the rule
   */
  @Column({ name: 'entity_type', type: 'varchar', length: 128, nullable: true })
  entityType: string | null;

  /**
   * ID of entity that triggered the rule
   */
  @Column({ name: 'entity_id', type: 'bigint', nullable: true })
  entityId: number | null;

  /**
   * Event that triggered the rule
   */
  @Column({ name: 'trigger_event', type: 'varchar', length: 64, nullable: true })
  triggerEvent: string | null;

  /**
   * Execution status
   */
  @Column({
    name: 'execution_status',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  executionStatus: ExecutionStatus;

  /**
   * Whether conditions matched
   */
  @Column({ name: 'condition_result', type: 'boolean', nullable: false, default: false })
  conditionResult: boolean;

  /**
   * Whether actions were executed
   */
  @Column({ name: 'actions_executed', type: 'boolean', nullable: false, default: false })
  actionsExecuted: boolean;

  /**
   * Execution time in milliseconds
   */
  @Column({ name: 'execution_time_ms', type: 'bigint', nullable: true })
  executionTimeMs: number | null;

  /**
   * Input data that was evaluated (JSON)
   */
  @Column({ name: 'input_data', type: 'jsonb', nullable: true })
  inputData: Record<string, any> | null;

  /**
   * Output data from actions (JSON)
   */
  @Column({ name: 'output_data', type: 'jsonb', nullable: true })
  outputData: Record<string, any> | null;

  /**
   * Error message if execution failed
   */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  /**
   * Stack trace if execution failed
   */
  @Column({ name: 'error_stack_trace', type: 'text', nullable: true })
  errorStackTrace: string | null;

  /**
   * User ID who triggered (if manual)
   */
  @Column({ name: 'triggered_by', type: 'bigint', nullable: true })
  triggeredBy: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;
}


