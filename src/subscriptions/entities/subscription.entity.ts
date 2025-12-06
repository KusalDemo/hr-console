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
import { Tenant } from '../../admin/entities/tenant.entity';
import { SubscriptionPlan, BillingCycle } from './subscription-plan.entity';

/**
 * Subscription Status Enum
 * Defines the possible states of a subscription
 */
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  TRIAL = 'TRIAL',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
}

/**
 * Payment Gateway Enum
 * Supported payment gateway providers
 */
export enum PaymentGateway {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  RAZORPAY = 'RAZORPAY',
  OTHER = 'OTHER',
}

/**
 * Subscription Metadata Interface
 * Defines the structure of metadata stored in JSONB
 * Used for flexible storage of subscription-specific data
 */
export interface SubscriptionMetadata {
  // Payment information
  paymentMethodType?: string;
  lastPaymentDate?: string;
  nextPaymentDate?: string;
  
  // Trial information
  trialDaysRemaining?: number;
  
  // Custom fields
  notes?: string;
  tags?: string[];
  
  // Additional metadata
  [key: string]: any;
}

/**
 * Subscription Entity - Represents tenant subscriptions in the admin schema
 * 
 * Subscriptions link tenants to subscription plans and track billing cycles,
 * payment information, and subscription lifecycle (trial, active, canceled, etc.)
 */
@Entity('subscriptions', { schema: 'admin' })
@Index('idx_subscriptions_tenant_id', ['tenant'])
@Index('idx_subscriptions_plan_id', ['plan'])
@Index('idx_subscriptions_status', ['status'])
@Index('idx_subscriptions_period_end', ['currentPeriodEnd'])
@Index('idx_subscriptions_grace_period', ['gracePeriodEnd'], { where: 'grace_period_end IS NOT NULL' })
@Index('idx_subscriptions_payment_gateway_id', ['paymentGatewaySubscriptionId'], {
  where: 'payment_gateway_subscription_id IS NOT NULL',
})
export class Subscription {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Tenant this subscription belongs to
   */
  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', type: 'bigint', nullable: false })
  tenantId: number;

  /**
   * Subscription plan this subscription is based on
   */
  @ManyToOne(() => SubscriptionPlan, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Column({ name: 'plan_id', type: 'bigint', nullable: false })
  planId: number;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  /**
   * Current billing period start date
   */
  @Column({ name: 'current_period_start', type: 'timestamptz', nullable: false })
  currentPeriodStart: Date;

  /**
   * Current billing period end date
   */
  @Column({ name: 'current_period_end', type: 'timestamptz', nullable: false })
  currentPeriodEnd: Date;

  /**
   * Whether subscription should be canceled at period end
   */
  @Column({ name: 'cancel_at_period_end', type: 'boolean', nullable: false, default: false })
  cancelAtPeriodEnd: boolean;

  /**
   * When subscription was canceled (if applicable)
   */
  @Column({ name: 'canceled_at', type: 'timestamptz', nullable: true })
  canceledAt: Date | null;

  /**
   * Trial period start date (if applicable)
   */
  @Column({ name: 'trial_start', type: 'timestamptz', nullable: true })
  trialStart: Date | null;

  /**
   * Trial period end date (if applicable)
   */
  @Column({ name: 'trial_end', type: 'timestamptz', nullable: true })
  trialEnd: Date | null;

  /**
   * Grace period end date (if subscription is past due)
   */
  @Column({ name: 'grace_period_end', type: 'timestamptz', nullable: true })
  gracePeriodEnd: Date | null;

  /**
   * Subscription amount (may differ from plan price if customized)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: false })
  amount: number;

  @Column({ type: 'varchar', length: 8, nullable: false, default: 'USD' })
  currency: string;

  @Column({
    name: 'billing_cycle',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: BillingCycle.MONTHLY,
  })
  billingCycle: BillingCycle;

  /**
   * Payment method identifier (e.g., card ID, bank account ID)
   */
  @Column({ name: 'payment_method_id', type: 'varchar', length: 255, nullable: true })
  paymentMethodId: string | null;

  /**
   * Payment gateway provider
   */
  @Column({ name: 'payment_gateway', type: 'varchar', length: 64, nullable: true })
  paymentGateway: PaymentGateway | string | null;

  /**
   * Subscription ID from payment gateway (e.g., Stripe subscription ID)
   */
  @Column({ name: 'payment_gateway_subscription_id', type: 'varchar', length: 255, nullable: true })
  paymentGatewaySubscriptionId: string | null;

  /**
   * Subscription metadata stored as JSONB
   * Flexible structure for subscription-specific data
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: SubscriptionMetadata | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if subscription is currently active
   */
  isActive(): boolean {
    return this.status === SubscriptionStatus.ACTIVE || this.status === SubscriptionStatus.TRIAL;
  }

  /**
   * Check if subscription is in trial period
   */
  isTrial(): boolean {
    if (this.status !== SubscriptionStatus.TRIAL) {
      return false;
    }

    if (!this.trialEnd) {
      return false;
    }

    return this.trialEnd > new Date();
  }

  /**
   * Check if subscription is expired
   */
  isExpired(): boolean {
    if (this.status === SubscriptionStatus.EXPIRED) {
      return true;
    }

    // Check if current period has ended
    return this.currentPeriodEnd < new Date();
  }

  /**
   * Check if subscription is in grace period
   */
  isInGracePeriod(): boolean {
    if (!this.gracePeriodEnd) {
      return false;
    }

    return this.gracePeriodEnd > new Date();
  }

  /**
   * Check if subscription is canceled
   */
  isCanceled(): boolean {
    return this.status === SubscriptionStatus.CANCELED || this.canceledAt !== null;
  }

  /**
   * Check if subscription is past due
   */
  isPastDue(): boolean {
    return this.status === SubscriptionStatus.PAST_DUE;
  }

  /**
   * Check if subscription is suspended
   */
  isSuspended(): boolean {
    return this.status === SubscriptionStatus.SUSPENDED;
  }

  /**
   * Check if subscription will be canceled at period end
   */
  willCancelAtPeriodEnd(): boolean {
    return this.cancelAtPeriodEnd;
  }

  /**
   * Get days remaining in current billing period
   */
  getDaysRemainingInPeriod(): number {
    const now = new Date();
    if (this.currentPeriodEnd <= now) {
      return 0;
    }

    const diffTime = this.currentPeriodEnd.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get days remaining in trial (if applicable)
   */
  getDaysRemainingInTrial(): number | null {
    if (!this.isTrial() || !this.trialEnd) {
      return null;
    }

    const now = new Date();
    if (this.trialEnd <= now) {
      return 0;
    }

    const diffTime = this.trialEnd.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get days remaining in grace period (if applicable)
   */
  getDaysRemainingInGracePeriod(): number | null {
    if (!this.isInGracePeriod() || !this.gracePeriodEnd) {
      return null;
    }

    const now = new Date();
    const diffTime = this.gracePeriodEnd.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get metadata value
   */
  getMetadata<T = any>(key: string): T | null {
    if (!this.metadata) {
      return null;
    }
    return (this.metadata[key] as T) || null;
  }

  /**
   * Check if subscription can be renewed
   */
  canBeRenewed(): boolean {
    return (
      this.status === SubscriptionStatus.ACTIVE ||
      this.status === SubscriptionStatus.TRIAL ||
      this.status === SubscriptionStatus.PAST_DUE
    );
  }

  /**
   * Check if subscription can be canceled
   */
  canBeCanceled(): boolean {
    return this.isActive() && !this.isCanceled();
  }
}


