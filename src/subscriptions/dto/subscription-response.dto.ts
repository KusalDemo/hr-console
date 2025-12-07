import {
  IsNumber,
  IsString,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SubscriptionStatus,
  PaymentGateway,
  SubscriptionMetadata,
} from '../entities/subscription.entity';
import { BillingCycle } from '../entities/subscription-plan.entity';

/**
 * Subscription Plan Response DTO (simplified)
 * Used in subscription responses
 */
export class SubscriptionPlanResponseDto {
  @IsNumber()
  id: number;

  @IsString()
  planKey: string;

  @IsString()
  planName: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsNumber()
  price: number;

  @IsString()
  currency: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsOptional()
  @IsNumber()
  maxUsers?: number | null;

  @IsOptional()
  @IsNumber()
  maxOrganizations?: number | null;

  @IsOptional()
  @IsNumber()
  maxStorageGb?: number | null;

  @IsOptional()
  @IsObject()
  features?: any | null;
}

/**
 * Tenant Response DTO (simplified)
 * Used in subscription responses
 */
export class TenantResponseDto {
  @IsNumber()
  id: number;

  @IsString()
  tenantKey: string;

  @IsString()
  name: string;

  @IsBoolean()
  isActive: boolean;
}

/**
 * Subscription Response DTO
 * Represents a subscription in API responses
 */
export class SubscriptionResponseDto {
  @IsNumber()
  id: number;

  @ValidateNested()
  @Type(() => TenantResponseDto)
  tenant: TenantResponseDto;

  @IsNumber()
  tenantId: number;

  @ValidateNested()
  @Type(() => SubscriptionPlanResponseDto)
  plan: SubscriptionPlanResponseDto;

  @IsNumber()
  planId: number;

  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;

  @IsDateString()
  currentPeriodStart: string;

  @IsDateString()
  currentPeriodEnd: string;

  @IsBoolean()
  cancelAtPeriodEnd: boolean;

  @IsOptional()
  @IsDateString()
  canceledAt?: string | null;

  @IsOptional()
  @IsDateString()
  trialStart?: string | null;

  @IsOptional()
  @IsDateString()
  trialEnd?: string | null;

  @IsOptional()
  @IsDateString()
  gracePeriodEnd?: string | null;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsOptional()
  @IsString()
  paymentMethodId?: string | null;

  @IsOptional()
  @IsString()
  paymentGateway?: string | null;

  @IsOptional()
  @IsString()
  paymentGatewaySubscriptionId?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: SubscriptionMetadata | null;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;

  @IsOptional()
  @IsNumber()
  createdBy?: number | null;

  @IsOptional()
  @IsNumber()
  updatedBy?: number | null;

  // Computed fields
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isTrial?: boolean;

  @IsOptional()
  @IsBoolean()
  isExpired?: boolean;

  @IsOptional()
  @IsBoolean()
  isInGracePeriod?: boolean;

  @IsOptional()
  @IsBoolean()
  isCanceled?: boolean;

  @IsOptional()
  @IsNumber()
  daysRemainingInPeriod?: number;

  @IsOptional()
  @IsNumber()
  daysRemainingInTrial?: number | null;

  @IsOptional()
  @IsNumber()
  daysRemainingInGracePeriod?: number | null;
}

/**
 * Subscription Detail Response DTO
 * Extended subscription information with additional computed fields
 */
export class SubscriptionDetailResponseDto extends SubscriptionResponseDto {
  @IsOptional()
  @IsBoolean()
  canBeRenewed?: boolean;

  @IsOptional()
  @IsBoolean()
  canBeCanceled?: boolean;

  @IsOptional()
  @IsBoolean()
  willCancelAtPeriodEnd?: boolean;
}

/**
 * Subscription Creation Response DTO
 * Response after successfully creating a subscription
 */
export class SubscriptionCreationResponseDto {
  @ValidateNested()
  @Type(() => SubscriptionResponseDto)
  subscription: SubscriptionResponseDto;

  @IsString()
  message: string;
}

/**
 * Subscription List Response DTO
 * Response for paginated subscription lists
 */
export class SubscriptionListResponseDto {
  @ValidateNested({ each: true })
  @Type(() => SubscriptionResponseDto)
  subscriptions: SubscriptionResponseDto[];

  @IsNumber()
  total: number;

  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;

  @IsNumber()
  totalPages: number;
}

/**
 * Subscription Summary Response DTO
 * Summary information about a subscription
 */
export class SubscriptionSummaryResponseDto {
  @IsNumber()
  id: number;

  @IsString()
  status: SubscriptionStatus;

  @IsString()
  planName: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsDateString()
  currentPeriodEnd: string;

  @IsOptional()
  @IsNumber()
  daysRemaining?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
