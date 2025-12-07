import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

/**
 * Billing Cycle Enum
 * Defines the billing frequency for subscription plans
 */
export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

/**
 * Subscription Plan Features Interface
 * Defines the structure of features stored in JSONB
 * Features are plan-specific capabilities and limits
 */
export interface SubscriptionPlanFeatures {
  // Feature flags
  advancedAnalytics?: boolean;
  customBranding?: boolean;
  apiAccess?: boolean;
  sso?: boolean;
  prioritySupport?: boolean;
  customIntegrations?: boolean;

  // Limits (null means unlimited)
  maxApiCallsPerMonth?: number | null;
  maxWebhooks?: number | null;
  maxCustomFields?: number | null;
  maxReports?: number | null;

  // Additional feature metadata
  [key: string]: any;
}

/**
 * Subscription Plan Entity - Represents available subscription plans in the admin schema
 *
 * Subscription plans define pricing, billing cycles, and feature sets
 * Plans can be active/inactive and have a default plan for new tenants
 * Features are stored as JSONB for flexibility
 */
@Entity('subscription_plans', { schema: 'admin' })
@Index('idx_subscription_plans_key', ['planKey'])
@Index('idx_subscription_plans_active', ['isActive'])
@Index('idx_subscription_plans_default', ['isDefault'], { where: 'is_default = true' })
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'plan_key', type: 'varchar', length: 128, unique: true, nullable: false })
  planKey: string;

  @Column({ name: 'plan_name', type: 'varchar', length: 255, nullable: false })
  planName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: false, default: 0 })
  price: number;

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

  @Column({ name: 'billing_interval', type: 'integer', nullable: false, default: 1 })
  billingInterval: number;

  /**
   * Maximum number of users allowed (null means unlimited)
   */
  @Column({ name: 'max_users', type: 'integer', nullable: true })
  maxUsers: number | null;

  /**
   * Maximum number of organizations allowed (null means unlimited)
   */
  @Column({ name: 'max_organizations', type: 'integer', nullable: true })
  maxOrganizations: number | null;

  /**
   * Maximum storage in GB (null means unlimited)
   */
  @Column({ name: 'max_storage_gb', type: 'integer', nullable: true })
  maxStorageGb: number | null;

  /**
   * Plan features stored as JSONB
   * Flexible structure for plan-specific capabilities
   */
  @Column({ type: 'jsonb', nullable: true })
  features: SubscriptionPlanFeatures | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @Column({ name: 'is_default', type: 'boolean', nullable: false, default: false })
  isDefault: boolean;

  /**
   * Sort order for displaying plans (lower numbers appear first)
   */
  @Column({ name: 'sort_order', type: 'integer', nullable: false, default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Subscriptions using this plan
   * One plan can be used by multiple subscriptions
   */
  @OneToMany(
    () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Subscription } = require('./subscription.entity');
      return Subscription;
    },
    (subscription: any) => subscription.plan,
    {
      cascade: false,
      lazy: true,
    },
  )
  subscriptions: Promise<any[]>;

  /**
   * Check if plan is currently active and available
   */
  isAvailable(): boolean {
    return this.isActive;
  }

  /**
   * Check if a feature is enabled for this plan
   */
  hasFeature(featureKey: string): boolean {
    if (!this.features) {
      return false;
    }
    return this.features[featureKey] === true;
  }

  /**
   * Get a feature value
   */
  getFeature<T = any>(featureKey: string): T | null {
    if (!this.features) {
      return null;
    }
    return (this.features[featureKey] as T) || null;
  }

  /**
   * Check if plan has unlimited users
   */
  hasUnlimitedUsers(): boolean {
    return this.maxUsers === null;
  }

  /**
   * Check if plan has unlimited organizations
   */
  hasUnlimitedOrganizations(): boolean {
    return this.maxOrganizations === null;
  }

  /**
   * Check if plan has unlimited storage
   */
  hasUnlimitedStorage(): boolean {
    return this.maxStorageGb === null;
  }
}
