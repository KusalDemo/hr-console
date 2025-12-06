import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Accrual Method Enum
 */
export enum AccrualMethod {
  FRONT_LOADED = 'FRONT_LOADED',        // Entire year's leave granted at start
  PRO_RATED = 'PRO_RATED',              // Accrued proportionally over time
  CUSTOM_FORMULA = 'CUSTOM_FORMULA',    // Custom formula-based accrual
}

/**
 * Accrual Frequency Enum
 */
export enum AccrualFrequency {
  DAILY = 'DAILY',                      // Accrued daily
  WEEKLY = 'WEEKLY',                    // Accrued weekly
  MONTHLY = 'MONTHLY',                  // Accrued monthly
  YEARLY = 'YEARLY',                    // Accrued yearly
}

/**
 * Accrual Calculation Basis Enum
 */
export enum AccrualCalculationBasis {
  CALENDAR_YEAR = 'CALENDAR_YEAR',      // Based on calendar year (Jan 1 - Dec 31)
  HIRE_ANNIVERSARY = 'HIRE_ANNIVERSARY', // Based on hire date anniversary
  FISCAL_YEAR = 'FISCAL_YEAR',          // Based on fiscal year
}

/**
 * Waiting Period Type Enum
 */
export enum WaitingPeriodType {
  AFTER_HIRE = 'AFTER_HIRE',            // After hire date
  AFTER_ACCOUNT_ACTIVATION = 'AFTER_ACCOUNT_ACTIVATION', // After account activation
}

/**
 * Proration Method Enum
 */
export enum ProrationMethod {
  BY_DAYS = 'BY_DAYS',                  // Prorate by calendar days
  BY_MONTHS = 'BY_MONTHS',              // Prorate by months
  BY_WORKING_DAYS = 'BY_WORKING_DAYS',  // Prorate by working days only
}

/**
 * Leave Policy Entity - Represents a leave policy for a tenant
 * 
 * Leave policies support:
 * - Multiple policies per tenant (with effective date ranges)
 * - Policy templates for reuse
 * - Accrual methods (front-loaded, pro-rated, custom formula)
 * - Carry-over rules
 * - Waiting periods and probationary periods
 * - Proration rules for mid-year hires/terminations
 * - Negative balance handling
 * 
 * This is the foundation entity for leave policy management.
 * Future enhancements will include:
 * - Leave type relationships (one-to-many)
 * - Employee policy assignments
 * - Policy versioning
 */
@Entity('leave_policies')
@Index('idx_leave_policies_active', ['active'])
@Index('idx_leave_policies_template', ['isTemplate'])
@Index('idx_leave_policies_effective', ['effectiveStartDate', 'effectiveEndDate'])
@Index('idx_leave_policies_key', ['policyKey'])
export class LeavePolicy {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique policy key/identifier
   */
  @Column({ name: 'policy_key', type: 'varchar', length: 128, unique: true, nullable: true })
  policyKey: string | null;

  /**
   * Policy name
   */
  @Column({ name: 'policy_name', type: 'varchar', length: 255, nullable: false })
  policyName: string;

  /**
   * Policy description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Effective start date
   */
  @Column({ name: 'effective_start_date', type: 'date', nullable: false })
  effectiveStartDate: Date;

  /**
   * Effective end date (null means no end date)
   */
  @Column({ name: 'effective_end_date', type: 'date', nullable: true })
  effectiveEndDate: Date | null;

  /**
   * Whether this policy is currently active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: false })
  active: boolean;

  /**
   * Whether this is a template policy (for reuse)
   */
  @Column({ name: 'is_template', type: 'boolean', nullable: false, default: false })
  isTemplate: boolean;

  /**
   * Template category (for organizing templates)
   */
  @Column({ name: 'template_category', type: 'varchar', length: 128, nullable: true })
  templateCategory: string | null;

  /**
   * Parent policy ID (reference to template policy if cloned)
   */
  @Column({ name: 'parent_policy_id', type: 'bigint', nullable: true })
  parentPolicyId: number | null;

  /**
   * Probationary period in days (before employee can use leave)
   */
  @Column({ name: 'probationary_period_days', type: 'integer', nullable: true })
  probationaryPeriodDays: number | null;

  /**
   * Waiting period in days (after hire before accrual starts)
   */
  @Column({ name: 'waiting_period_days', type: 'integer', nullable: true })
  waitingPeriodDays: number | null;

  /**
   * Waiting period type
   */
  @Column({
    name: 'waiting_period_type',
    type: 'varchar',
    length: 32,
    nullable: true,
    default: WaitingPeriodType.AFTER_HIRE,
  })
  waitingPeriodType: WaitingPeriodType | null;

  /**
   * Accrual method (default for policy, can be overridden per leave type)
   */
  @Column({
    name: 'accrual_method',
    type: 'varchar',
    length: 32,
    nullable: true,
    default: AccrualMethod.PRO_RATED,
  })
  accrualMethod: AccrualMethod | null;

  /**
   * Accrual frequency
   */
  @Column({
    name: 'accrual_frequency',
    type: 'varchar',
    length: 32,
    nullable: true,
    default: AccrualFrequency.MONTHLY,
  })
  accrualFrequency: AccrualFrequency | null;

  /**
   * Custom accrual formula (for CUSTOM_FORMULA method)
   */
  @Column({ name: 'accrual_custom_formula', type: 'text', nullable: true })
  accrualCustomFormula: string | null;

  /**
   * Accrual start date (if different from hire date)
   */
  @Column({ name: 'accrual_start_date', type: 'date', nullable: true })
  accrualStartDate: Date | null;

  /**
   * Accrual calculation basis
   */
  @Column({
    name: 'accrual_calculation_basis',
    type: 'varchar',
    length: 32,
    nullable: true,
    default: AccrualCalculationBasis.CALENDAR_YEAR,
  })
  accrualCalculationBasis: AccrualCalculationBasis | null;

  /**
   * Whether unused leave can be carried over
   */
  @Column({ name: 'allow_carry_over', type: 'boolean', nullable: false, default: false })
  allowCarryOver: boolean;

  /**
   * Percentage of unused leave that can be carried over
   */
  @Column({ name: 'carry_over_percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  carryOverPercentage: number | null;

  /**
   * Maximum days that can be carried over
   */
  @Column({ name: 'carry_over_max_days', type: 'integer', nullable: true })
  carryOverMaxDays: number | null;

  /**
   * Days after which carry-over expires (0 = never expires)
   */
  @Column({ name: 'carry_over_expiry_days', type: 'integer', nullable: true })
  carryOverExpiryDays: number | null;

  /**
   * Fixed expiry date for carry-over
   */
  @Column({ name: 'carry_over_expiry_date', type: 'date', nullable: true })
  carryOverExpiryDate: Date | null;

  /**
   * Whether employees can go into negative balance
   */
  @Column({ name: 'allow_negative_balance', type: 'boolean', nullable: false, default: false })
  allowNegativeBalance: boolean;

  /**
   * Maximum negative balance allowed (in days)
   */
  @Column({ name: 'max_negative_balance_days', type: 'integer', nullable: true })
  maxNegativeBalanceDays: number | null;

  /**
   * Whether to prorate leave for employees hired mid-year
   */
  @Column({ name: 'prorate_on_hire', type: 'boolean', nullable: false, default: true })
  prorateOnHire: boolean;

  /**
   * Whether to prorate leave on termination
   */
  @Column({ name: 'prorate_on_termination', type: 'boolean', nullable: false, default: true })
  prorateOnTermination: boolean;

  /**
   * Proration method
   */
  @Column({
    name: 'proration_method',
    type: 'varchar',
    length: 32,
    nullable: true,
    default: ProrationMethod.BY_DAYS,
  })
  prorationMethod: ProrationMethod | null;

  /**
   * Policy metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'policy_metadata', type: 'jsonb', nullable: true })
  policyMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if policy is currently active
   */
  isActive(): boolean {
    if (!this.active) {
      return false;
    }

    const now = new Date();
    const startDate = new Date(this.effectiveStartDate);
    
    if (now < startDate) {
      return false;
    }

    if (this.effectiveEndDate) {
      const endDate = new Date(this.effectiveEndDate);
      if (now > endDate) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if policy is effective on a given date
   */
  isEffectiveOn(date: Date): boolean {
    const checkDate = new Date(date);
    const startDate = new Date(this.effectiveStartDate);

    if (checkDate < startDate) {
      return false;
    }

    if (this.effectiveEndDate) {
      const endDate = new Date(this.effectiveEndDate);
      if (checkDate > endDate) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if policy allows carry-over
   */
  allowsCarryOver(): boolean {
    return this.allowCarryOver;
  }

  /**
   * Check if policy allows negative balance
   */
  allowsNegativeBalance(): boolean {
    return this.allowNegativeBalance;
  }

  /**
   * Check if policy requires proration on hire
   */
  requiresProrationOnHire(): boolean {
    return this.prorateOnHire;
  }

  /**
   * Check if policy requires proration on termination
   */
  requiresProrationOnTermination(): boolean {
    return this.prorateOnTermination;
  }

  /**
   * Get maximum carry-over days (considering percentage and max days)
   */
  getMaxCarryOverDays(unusedDays: number): number {
    if (!this.allowCarryOver) {
      return 0;
    }

    let maxCarryOver = unusedDays;

    // Apply percentage limit if set
    if (this.carryOverPercentage !== null && this.carryOverPercentage > 0) {
      maxCarryOver = Math.floor(unusedDays * (this.carryOverPercentage / 100));
    }

    // Apply absolute max limit if set
    if (this.carryOverMaxDays !== null && this.carryOverMaxDays > 0) {
      maxCarryOver = Math.min(maxCarryOver, this.carryOverMaxDays);
    }

    return Math.max(0, maxCarryOver);
  }
}

