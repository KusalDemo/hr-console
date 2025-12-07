import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsDateString,
  MaxLength,
  Min,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle } from '../entities/subscription-plan.entity';
import {
  SubscriptionStatus,
  PaymentGateway,
  SubscriptionMetadata,
} from '../entities/subscription.entity';

/**
 * Plan Selection DTO
 * Used when creating a subscription to select a plan
 */
export class PlanSelectionDto {
  @IsNotEmpty({ message: 'Plan ID is required' })
  @IsNumber({}, { message: 'Plan ID must be a number' })
  @Min(1, { message: 'Plan ID must be greater than 0' })
  planId: number;
}

/**
 * Create Subscription Request DTO
 * Used for creating a new subscription for a tenant
 */
export class CreateSubscriptionDto {
  @IsNotEmpty({ message: 'Tenant ID is required' })
  @IsNumber({}, { message: 'Tenant ID must be a number' })
  @Min(1, { message: 'Tenant ID must be greater than 0' })
  tenantId: number;

  @IsNotEmpty({ message: 'Plan ID is required' })
  @IsNumber({}, { message: 'Plan ID must be a number' })
  @Min(1, { message: 'Plan ID must be greater than 0' })
  planId: number;

  @IsOptional()
  @IsEnum(SubscriptionStatus, {
    message: `Status must be one of: ${Object.values(SubscriptionStatus).join(', ')}`,
  })
  status?: SubscriptionStatus;

  /**
   * Current billing period start date
   * If not provided, defaults to current date
   */
  @IsOptional()
  @IsDateString({}, { message: 'Current period start must be a valid ISO date string' })
  currentPeriodStart?: string;

  /**
   * Current billing period end date
   * If not provided, will be calculated based on billing cycle
   */
  @IsOptional()
  @IsDateString({}, { message: 'Current period end must be a valid ISO date string' })
  currentPeriodEnd?: string;

  /**
   * Whether subscription should be canceled at period end
   */
  @IsOptional()
  @IsBoolean({ message: 'Cancel at period end must be a boolean' })
  cancelAtPeriodEnd?: boolean;

  /**
   * Trial period start date (if applicable)
   */
  @IsOptional()
  @IsDateString({}, { message: 'Trial start must be a valid ISO date string' })
  trialStart?: string;

  /**
   * Trial period end date (if applicable)
   */
  @IsOptional()
  @IsDateString({}, { message: 'Trial end must be a valid ISO date string' })
  trialEnd?: string;

  /**
   * Grace period end date (if subscription is past due)
   */
  @IsOptional()
  @IsDateString({}, { message: 'Grace period end must be a valid ISO date string' })
  gracePeriodEnd?: string;

  /**
   * Subscription amount (may differ from plan price if customized)
   * If not provided, uses plan price
   */
  @IsOptional()
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0, { message: 'Amount must be greater than or equal to 0' })
  amount?: number;

  @IsOptional()
  @IsString({ message: 'Currency must be a string' })
  @MaxLength(8, { message: 'Currency must not exceed 8 characters' })
  currency?: string;

  @IsOptional()
  @IsEnum(BillingCycle, {
    message: `Billing cycle must be one of: ${Object.values(BillingCycle).join(', ')}`,
  })
  billingCycle?: BillingCycle;

  /**
   * Payment method identifier (e.g., card ID, bank account ID)
   */
  @IsOptional()
  @IsString({ message: 'Payment method ID must be a string' })
  @MaxLength(255, { message: 'Payment method ID must not exceed 255 characters' })
  paymentMethodId?: string;

  /**
   * Payment gateway provider
   */
  @IsOptional()
  @IsEnum(PaymentGateway, {
    message: `Payment gateway must be one of: ${Object.values(PaymentGateway).join(', ')}`,
  })
  paymentGateway?: PaymentGateway | string;

  /**
   * Subscription ID from payment gateway (e.g., Stripe subscription ID)
   */
  @IsOptional()
  @IsString({ message: 'Payment gateway subscription ID must be a string' })
  @MaxLength(255, { message: 'Payment gateway subscription ID must not exceed 255 characters' })
  paymentGatewaySubscriptionId?: string;

  /**
   * Subscription metadata (JSONB)
   */
  @IsOptional()
  @IsObject({ message: 'Metadata must be an object' })
  metadata?: SubscriptionMetadata;
}

/**
 * Create Subscription with Plan Selection DTO
 * Simplified DTO for creating subscription by selecting a plan
 */
export class CreateSubscriptionWithPlanDto {
  @IsNotEmpty({ message: 'Tenant ID is required' })
  @IsNumber({}, { message: 'Tenant ID must be a number' })
  @Min(1, { message: 'Tenant ID must be greater than 0' })
  tenantId: number;

  @IsNotEmpty({ message: 'Plan selection is required' })
  @ValidateNested()
  @Type(() => PlanSelectionDto)
  plan: PlanSelectionDto;

  /**
   * Start subscription in trial mode
   */
  @IsOptional()
  @IsBoolean({ message: 'Start trial must be a boolean' })
  startTrial?: boolean;

  /**
   * Trial duration in days (if startTrial is true)
   */
  @IsOptional()
  @IsNumber({}, { message: 'Trial days must be a number' })
  @Min(1, { message: 'Trial days must be at least 1' })
  trialDays?: number;

  /**
   * Payment method identifier (if payment is required upfront)
   */
  @IsOptional()
  @IsString({ message: 'Payment method ID must be a string' })
  @MaxLength(255, { message: 'Payment method ID must not exceed 255 characters' })
  paymentMethodId?: string;

  /**
   * Payment gateway provider
   */
  @IsOptional()
  @IsEnum(PaymentGateway, {
    message: `Payment gateway must be one of: ${Object.values(PaymentGateway).join(', ')}`,
  })
  paymentGateway?: PaymentGateway | string;

  /**
   * Custom amount (overrides plan price if provided)
   */
  @IsOptional()
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0, { message: 'Amount must be greater than or equal to 0' })
  amount?: number;

  /**
   * Currency (defaults to plan currency if not provided)
   */
  @IsOptional()
  @IsString({ message: 'Currency must be a string' })
  @MaxLength(8, { message: 'Currency must not exceed 8 characters' })
  currency?: string;
}
