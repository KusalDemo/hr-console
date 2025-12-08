import {
  IsNumber,
  IsString,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import { BillingCycle, SubscriptionPlanFeatures } from '../entities/subscription-plan.entity';

/**
 * Subscription Plan Response DTO
 * Represents a subscription plan in API responses
 */
export class PlanResponseDto {
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

  @IsNumber()
  billingInterval: number;

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
  features?: SubscriptionPlanFeatures | null;

  @IsBoolean()
  isActive: boolean;

  @IsBoolean()
  isDefault: boolean;

  @IsNumber()
  sortOrder: number;

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
}

/**
 * Plan List Response DTO
 * Response for paginated plan lists
 */
export class PlanListResponseDto {
  plans: PlanResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}


