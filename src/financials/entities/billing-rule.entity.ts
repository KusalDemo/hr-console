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
import { Currency } from './currency.entity';

/**
 * Billing Type Enum
 */
export enum BillingType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  USAGE_BASED = 'USAGE_BASED',
  FIXED = 'FIXED',
  HYBRID = 'HYBRID',
}

/**
 * Billing Frequency Enum
 */
export enum BillingFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  ONE_TIME = 'ONE_TIME',
}

/**
 * Billing Trigger Type Enum
 */
export enum BillingTriggerType {
  AUTOMATIC = 'AUTOMATIC',
  MANUAL = 'MANUAL',
  EVENT_BASED = 'EVENT_BASED',
}

/**
 * Pricing Model Enum
 */
export enum PricingModel {
  FIXED_PRICE = 'FIXED_PRICE',
  HOURLY_RATE = 'HOURLY_RATE',
  PER_UNIT = 'PER_UNIT',
  TIERED = 'TIERED',
  VOLUME_DISCOUNT = 'VOLUME_DISCOUNT',
}

/**
 * Recurrence Pattern Enum
 */
export enum RecurrencePattern {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

/**
 * Billing Rule Status Enum
 */
export enum BillingRuleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

/**
 * Billing Rule Entity
 * 
 * Rules for subscription-based or usage-based billing with recurrence patterns.
 */
@Entity('billing_rules')
@Index('idx_billing_rules_key', ['ruleKey'])
@Index('idx_billing_rules_type', ['billingType'])
@Index('idx_billing_rules_status', ['status'])
@Index('idx_billing_rules_active', ['isActive'])
@Index('idx_billing_rules_next_billing', ['nextBillingDate'])
@Index('idx_billing_rules_source', ['sourceType', 'sourceEntityId'])
export class BillingRule {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Rule name/identifier
   */
  @Column({ name: 'rule_name', type: 'varchar', length: 255, nullable: false })
  ruleName: string;

  /**
   * Unique rule key
   */
  @Column({ name: 'rule_key', type: 'varchar', length: 128, unique: true, nullable: false })
  ruleKey: string;

  /**
   * Billing type
   */
  @Column({
    name: 'billing_type',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  billingType: BillingType;

  /**
   * Billing frequency
   */
  @Column({
    name: 'billing_frequency',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  billingFrequency: BillingFrequency;

  /**
   * Billing interval (e.g., every 2 months)
   */
  @Column({ name: 'billing_interval', type: 'integer', nullable: false, default: 1 })
  billingInterval: number;

  /**
   * Trigger type
   */
  @Column({
    name: 'trigger_type',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  triggerType: BillingTriggerType;

  /**
   * Event that triggers billing
   */
  @Column({ name: 'trigger_event', type: 'varchar', length: 128, nullable: true })
  triggerEvent: string | null;

  /**
   * Source type
   */
  @Column({ name: 'source_type', type: 'varchar', length: 128, nullable: false })
  sourceType: string;

  /**
   * Source entity ID
   */
  @Column({ name: 'source_entity_id', type: 'bigint', nullable: true })
  sourceEntityId: number | null;

  /**
   * Filter criteria for source (JSON)
   */
  @Column({ name: 'source_filter', type: 'jsonb', nullable: true })
  sourceFilter: Record<string, any> | null;

  /**
   * Pricing model
   */
  @Column({
    name: 'pricing_model',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  pricingModel: PricingModel;

  /**
   * Base price
   */
  @Column({
    name: 'base_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  basePrice: number | null;

  /**
   * Unit price (for per-unit pricing)
   */
  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  unitPrice: number | null;

  /**
   * Currency
   */
  @ManyToOne(() => Currency, {
    nullable: true,
    onDelete: 'RESTRICT',
    lazy: true,
  })
  @JoinColumn({ name: 'currency_id' })
  currency: Promise<Currency | null> | Currency | null;

  @Column({ name: 'currency_id', type: 'bigint', nullable: true })
  currencyId: number | null;

  /**
   * Currency code (for quick access)
   */
  @Column({ type: 'varchar', length: 8, nullable: false, default: 'USD' })
  currencyCode: string;

  /**
   * Pricing configuration (tiers, discounts, etc.)
   */
  @Column({ name: 'pricing_config', type: 'jsonb', nullable: true })
  pricingConfig: Record<string, any> | null;

  /**
   * Tax rate percentage
   */
  @Column({
    name: 'tax_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: false,
    default: 0,
  })
  taxRate: number;

  /**
   * Whether tax is included in price
   */
  @Column({ name: 'tax_included', type: 'boolean', nullable: false, default: false })
  taxIncluded: boolean;

  /**
   * Discount percentage
   */
  @Column({
    name: 'discount_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: false,
    default: 0,
  })
  discountPercentage: number;

  /**
   * Discount amount
   */
  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: false,
    default: 0,
  })
  discountAmount: number;

  /**
   * Start date for billing period
   */
  @Column({ name: 'billing_period_start', type: 'date', nullable: true })
  billingPeriodStart: Date | null;

  /**
   * End date for billing period
   */
  @Column({ name: 'billing_period_end', type: 'date', nullable: true })
  billingPeriodEnd: Date | null;

  /**
   * Day of month for billing (1-31)
   */
  @Column({ name: 'billing_day', type: 'integer', nullable: true })
  billingDay: number | null;

  /**
   * Whether billing is recurring
   */
  @Column({ name: 'is_recurring', type: 'boolean', nullable: false, default: false })
  isRecurring: boolean;

  /**
   * Recurrence pattern
   */
  @Column({ name: 'recurrence_pattern', type: 'varchar', length: 64, nullable: true })
  recurrencePattern: RecurrencePattern | null;

  /**
   * Recurrence interval
   */
  @Column({ name: 'recurrence_interval', type: 'integer', nullable: true, default: 1 })
  recurrenceInterval: number | null;

  /**
   * End date for recurrence
   */
  @Column({ name: 'recurrence_end_date', type: 'date', nullable: true })
  recurrenceEndDate: Date | null;

  /**
   * Number of occurrences
   */
  @Column({ name: 'recurrence_count', type: 'integer', nullable: true })
  recurrenceCount: number | null;

  /**
   * Next billing date
   */
  @Column({ name: 'next_billing_date', type: 'date', nullable: true })
  nextBillingDate: Date | null;

  /**
   * Status
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: BillingRuleStatus.ACTIVE,
  })
  status: BillingRuleStatus;

  /**
   * Whether rule is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Invoice template ID
   */
  @Column({ name: 'invoice_template_id', type: 'bigint', nullable: true })
  invoiceTemplateId: number | null;

  /**
   * Automatically generate invoice
   */
  @Column({ name: 'auto_generate_invoice', type: 'boolean', nullable: false, default: true })
  autoGenerateInvoice: boolean;

  /**
   * Automatically send invoice
   */
  @Column({ name: 'auto_send_invoice', type: 'boolean', nullable: false, default: false })
  autoSendInvoice: boolean;

  /**
   * Payment terms (e.g., "Net 30")
   */
  @Column({ name: 'payment_terms', type: 'varchar', length: 128, nullable: true })
  paymentTerms: string | null;

  /**
   * Days until due date
   */
  @Column({ name: 'due_date_days', type: 'integer', nullable: true, default: 30 })
  dueDateDays: number | null;

  /**
   * Whether transaction requires approval
   */
  @Column({ name: 'requires_approval', type: 'boolean', nullable: false, default: false })
  requiresApproval: boolean;

  /**
   * Reference to approval workflow
   */
  @Column({ name: 'approval_workflow_id', type: 'bigint', nullable: true })
  approvalWorkflowId: number | null;

  /**
   * Description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Rule metadata (JSONB for additional flexible data)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if rule is active
   */
  isActiveRule(): boolean {
    return this.isActive && this.status === BillingRuleStatus.ACTIVE;
  }

  /**
   * Check if next billing is due
   */
  isBillingDue(date?: Date): boolean {
    if (!this.nextBillingDate) {
      return false;
    }

    const checkDate = date || new Date();
    return checkDate >= new Date(this.nextBillingDate);
  }
}
