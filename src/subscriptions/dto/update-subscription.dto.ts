import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  IsBoolean,
  IsDateString,
  MaxLength,
  Min,
  IsObject,
} from 'class-validator';
import { BillingCycle } from '../entities/subscription-plan.entity';
import { SubscriptionStatus, PaymentGateway, SubscriptionMetadata } from '../entities/subscription.entity';

/**
 * Update Subscription Request DTO
 * Used for updating subscription information
 * All fields are optional - only provided fields will be updated
 */
export class UpdateSubscriptionDto {
  @IsOptional()
  @IsNumber({}, { message: 'Plan ID must be a number' })
  @Min(1, { message: 'Plan ID must be greater than 0' })
  planId?: number;

  @IsOptional()
  @IsEnum(SubscriptionStatus, {
    message: `Status must be one of: ${Object.values(SubscriptionStatus).join(', ')}`,
  })
  status?: SubscriptionStatus;

  /**
   * Current billing period start date
   */
  @IsOptional()
  @IsDateString({}, { message: 'Current period start must be a valid ISO date string' })
  currentPeriodStart?: string;

  /**
   * Current billing period end date
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
   * Trial period start date
   */
  @IsOptional()
  @IsDateString({}, { message: 'Trial start must be a valid ISO date string' })
  trialStart?: string;

  /**
   * Trial period end date
   */
  @IsOptional()
  @IsDateString({}, { message: 'Trial end must be a valid ISO date string' })
  trialEnd?: string;

  /**
   * Grace period end date
   */
  @IsOptional()
  @IsDateString({}, { message: 'Grace period end must be a valid ISO date string' })
  gracePeriodEnd?: string;

  /**
   * Subscription amount (may differ from plan price if customized)
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
   * Payment method identifier
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
   * Subscription ID from payment gateway
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
 * Cancel Subscription DTO
 * Used for canceling a subscription
 */
export class CancelSubscriptionDto {
  @IsOptional()
  @IsBoolean({ message: 'Cancel at period end must be a boolean' })
  cancelAtPeriodEnd?: boolean = true;

  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason?: string;
}

/**
 * Renew Subscription DTO
 * Used for renewing a subscription
 */
export class RenewSubscriptionDto {
  @IsOptional()
  @IsNumber({}, { message: 'Plan ID must be a number' })
  @Min(1, { message: 'Plan ID must be greater than 0' })
  planId?: number;

  @IsOptional()
  @IsString({ message: 'Payment method ID must be a string' })
  @MaxLength(255, { message: 'Payment method ID must not exceed 255 characters' })
  paymentMethodId?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0, { message: 'Amount must be greater than or equal to 0' })
  amount?: number;
}


