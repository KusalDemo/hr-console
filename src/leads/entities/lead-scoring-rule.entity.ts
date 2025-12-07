import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Scoring Rule Type Enum
 */
export enum ScoringRuleType {
  FIELD_MATCH = 'FIELD_MATCH', // Match on field value
  FIELD_RANGE = 'FIELD_RANGE', // Match on field range
  BEHAVIOR = 'BEHAVIOR', // Behavior-based scoring
  ENGAGEMENT = 'ENGAGEMENT', // Engagement-based scoring
  CUSTOM = 'CUSTOM', // Custom expression
}

/**
 * Scoring Rule Operator Enum
 */
export enum ScoringRuleOperator {
  EQUALS = 'EQUALS', // Equals
  NOT_EQUALS = 'NOT_EQUALS', // Not equals
  CONTAINS = 'CONTAINS', // Contains
  NOT_CONTAINS = 'NOT_CONTAINS', // Not contains
  STARTS_WITH = 'STARTS_WITH', // Starts with
  ENDS_WITH = 'ENDS_WITH', // Ends with
  GREATER_THAN = 'GREATER_THAN', // Greater than
  LESS_THAN = 'LESS_THAN', // Less than
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL', // Greater than or equal
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL', // Less than or equal
  BETWEEN = 'BETWEEN', // Between
  IN = 'IN', // In list
  NOT_IN = 'NOT_IN', // Not in list
  IS_NULL = 'IS_NULL', // Is null
  IS_NOT_NULL = 'IS_NOT_NULL', // Is not null
}

/**
 * Lead Scoring Rule Entity
 *
 * Automated scoring rules for leads with conditions, actions, and priority.
 * Supports rule activation dates, tenant/org scoping, and rule evaluation.
 */
@Entity('lead_scoring_rules')
@Index('idx_lead_scoring_rules_active', ['isActive'])
@Index('idx_lead_scoring_rules_priority', ['priority'])
@Index('idx_lead_scoring_rules_organization', ['organizationId'])
@Index('idx_lead_scoring_rules_type', ['ruleType'])
export class LeadScoringRule {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Rule name
   */
  @Column({ name: 'rule_name', type: 'varchar', length: 255, nullable: false })
  ruleName: string;

  /**
   * Rule description
   */
  @Column({ name: 'rule_description', type: 'text', nullable: true })
  ruleDescription: string | null;

  /**
   * Rule type
   */
  @Column({
    name: 'rule_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ScoringRuleType.FIELD_MATCH,
  })
  ruleType: ScoringRuleType;

  /**
   * Field to evaluate (for field-based rules)
   */
  @Column({ name: 'field_name', type: 'varchar', length: 128, nullable: true })
  fieldName: string | null;

  /**
   * Operator for comparison
   */
  @Column({
    name: 'operator',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  operator: ScoringRuleOperator | null;

  /**
   * Value to compare against (can be JSON for complex values)
   */
  @Column({ name: 'field_value', type: 'text', nullable: true })
  fieldValue: string | null;

  /**
   * Custom expression (for CUSTOM rule type)
   */
  @Column({ name: 'custom_expression', type: 'text', nullable: true })
  customExpression: string | null;

  /**
   * Score points to add/subtract when rule matches
   */
  @Column({ name: 'score_points', type: 'integer', nullable: false, default: 0 })
  scorePoints: number;

  /**
   * Rule priority (higher priority rules evaluated first)
   */
  @Column({ name: 'priority', type: 'integer', nullable: false, default: 0 })
  priority: number;

  /**
   * Organization ID (for organization-scoped rules)
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Activation date (rule only applies after this date)
   */
  @Column({ name: 'activation_date', type: 'timestamptz', nullable: true })
  activationDate: Date | null;

  /**
   * Expiration date (rule only applies before this date)
   */
  @Column({ name: 'expiration_date', type: 'timestamptz', nullable: true })
  expirationDate: Date | null;

  /**
   * Maximum score cap (prevents score from exceeding this value)
   */
  @Column({ name: 'max_score_cap', type: 'integer', nullable: true })
  maxScoreCap: number | null;

  /**
   * Minimum score floor (prevents score from going below this value)
   */
  @Column({ name: 'min_score_floor', type: 'integer', nullable: true })
  minScoreFloor: number | null;

  /**
   * Rule metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'rule_metadata', type: 'jsonb', nullable: true })
  ruleMetadata: Record<string, any> | null;

  /**
   * Whether rule is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if rule is currently active
   */
  isCurrentlyActive(): boolean {
    if (!this.isActive) {
      return false;
    }

    const now = new Date();

    if (this.activationDate && now < this.activationDate) {
      return false;
    }

    if (this.expirationDate && now > this.expirationDate) {
      return false;
    }

    return true;
  }
}
