import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { RuleExecutionLog } from './rule-execution-log.entity';

/**
 * Rule Type Enum
 */
export enum RuleType {
  VALIDATION = 'VALIDATION', // Validation rules (prevent invalid operations)
  TRANSFORMATION = 'TRANSFORMATION', // Data transformation rules
  NOTIFICATION = 'NOTIFICATION', // Notification rules
  CALCULATION = 'CALCULATION', // Calculation/computation rules
  WORKFLOW = 'WORKFLOW', // Workflow triggering rules
  AUDIT = 'AUDIT', // Audit/logging rules
  BUSINESS_LOGIC = 'BUSINESS_LOGIC', // Business logic rules
  INTEGRATION = 'INTEGRATION', // Integration/API rules
}

/**
 * Trigger Type Enum
 */
export enum RuleTriggerType {
  EVENT = 'EVENT', // Event-driven (entity lifecycle events)
  SCHEDULED = 'SCHEDULED', // Scheduled/cron-based
  MANUAL = 'MANUAL', // Manually triggered
  API = 'API', // API/webhook trigger
  CONDITIONAL = 'CONDITIONAL', // Conditional trigger based on data state
}

/**
 * Tenant Scope Enum
 */
export enum TenantScope {
  ALL = 'ALL', // All organizations in tenant
  ORGANIZATION = 'ORGANIZATION', // Specific organization
  DEPARTMENT = 'DEPARTMENT', // Specific department
  USER = 'USER', // Specific user
}

/**
 * Execution Mode Enum
 */
export enum ExecutionMode {
  SYNCHRONOUS = 'SYNCHRONOUS', // Execute immediately
  ASYNCHRONOUS = 'ASYNCHRONOUS', // Execute in background
  SCHEDULED = 'SCHEDULED', // Execute at scheduled time
}

/**
 * Business Rule Entity
 * 
 * Defines business rules with conditions, actions, and triggers.
 * Supports rule priority, activation dates, tenant/org scoping, and different rule types.
 */
@Entity('business_rules')
@Index('idx_business_rules_key', ['ruleKey'], { unique: true })
@Index('idx_business_rules_type', ['ruleType'])
@Index('idx_business_rules_entity_type', ['entityType'])
@Index('idx_business_rules_trigger', ['triggerType'])
@Index('idx_business_rules_active', ['isActive'])
@Index('idx_business_rules_priority', ['priority'])
export class BusinessRule {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique rule key
   */
  @Column({ name: 'rule_key', type: 'varchar', length: 128, unique: true, nullable: false })
  ruleKey: string;

  /**
   * Rule name
   */
  @Column({ name: 'rule_name', type: 'varchar', length: 255, nullable: false })
  ruleName: string;

  /**
   * Rule type
   */
  @Column({
    name: 'rule_type',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  ruleType: RuleType;

  /**
   * Entity type this rule applies to (optional)
   */
  @Column({ name: 'entity_type', type: 'varchar', length: 128, nullable: true })
  entityType: string | null;

  /**
   * Trigger type
   */
  @Column({
    name: 'trigger_type',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  triggerType: RuleTriggerType;

  /**
   * JSON array of event types: ["CREATE", "UPDATE", "DELETE", "CUSTOM"]
   */
  @Column({ name: 'trigger_events', type: 'jsonb', nullable: true })
  triggerEvents: string[] | null;

  /**
   * JSON: condition expressions (JSONPath/SpEL-like)
   */
  @Column({ type: 'jsonb', nullable: false })
  conditions: Record<string, any>;

  /**
   * JSON: actions to execute when conditions match
   */
  @Column({ type: 'jsonb', nullable: false })
  actions: Record<string, any>;

  /**
   * Priority (lower number = higher priority)
   */
  @Column({ type: 'integer', nullable: false, default: 100 })
  priority: number;

  /**
   * Whether rule is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Rule becomes active on this date
   */
  @Column({ name: 'activation_date', type: 'timestamptz', nullable: true })
  activationDate: Date | null;

  /**
   * Rule expires on this date
   */
  @Column({ name: 'expiration_date', type: 'timestamptz', nullable: true })
  expirationDate: Date | null;

  /**
   * Optional: scope rule to specific organization
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Scope within tenant
   */
  @Column({
    name: 'tenant_scope',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: TenantScope.ALL,
  })
  tenantScope: TenantScope;

  /**
   * Execution mode
   */
  @Column({
    name: 'execution_mode',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ExecutionMode.SYNCHRONOUS,
  })
  executionMode: ExecutionMode;

  /**
   * Stop evaluating other rules if this matches
   */
  @Column({ name: 'stop_on_match', type: 'boolean', nullable: false, default: false })
  stopOnMatch: boolean;

  /**
   * Rule description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Additional rule metadata
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Rule execution logs
   */
  @OneToMany(() => RuleExecutionLog, (log) => log.businessRule, {
    cascade: false,
    lazy: true,
  })
  executionLogs: Promise<RuleExecutionLog[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if rule is currently active (considering dates)
   */
  isCurrentlyActive(): boolean {
    if (!this.isActive) {
      return false;
    }

    const now = new Date();

    if (this.activationDate && this.activationDate > now) {
      return false;
    }

    if (this.expirationDate && this.expirationDate < now) {
      return false;
    }

    return true;
  }
}


