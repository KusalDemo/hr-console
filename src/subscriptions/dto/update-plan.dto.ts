import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsObject,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BillingCycle, SubscriptionPlanFeatures } from '../entities/subscription-plan.entity';

/**
 * Update Subscription Plan Request DTO
 * Used for updating subscription plan information
 * All fields are optional - only provided fields will be updated
 */
export class UpdatePlanDto {
  @IsOptional()
  @IsString({ message: 'Plan name must be a string' })
  @MinLength(2, { message: 'Plan name must be at least 2 characters' })
  @MaxLength(255, { message: 'Plan name must not exceed 255 characters' })
  planName?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string | null;

  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price must be greater than or equal to 0' })
  price?: number;

  @IsOptional()
  @IsString({ message: 'Currency must be a string' })
  @MaxLength(8, { message: 'Currency must not exceed 8 characters' })
  currency?: string;

  @IsOptional()
  @IsEnum(BillingCycle, {
    message: `Billing cycle must be one of: ${Object.values(BillingCycle).join(', ')}`,
  })
  billingCycle?: BillingCycle;

  @IsOptional()
  @IsNumber({}, { message: 'Billing interval must be a number' })
  @Min(1, { message: 'Billing interval must be at least 1' })
  billingInterval?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Max users must be a number' })
  @Min(0, { message: 'Max users must be greater than or equal to 0' })
  maxUsers?: number | null;

  @IsOptional()
  @IsNumber({}, { message: 'Max organizations must be a number' })
  @Min(0, { message: 'Max organizations must be greater than or equal to 0' })
  maxOrganizations?: number | null;

  @IsOptional()
  @IsNumber({}, { message: 'Max storage GB must be a number' })
  @Min(0, { message: 'Max storage GB must be greater than or equal to 0' })
  maxStorageGb?: number | null;

  @IsOptional()
  @IsObject({ message: 'Features must be an object' })
  features?: SubscriptionPlanFeatures | null;

  @IsOptional()
  @IsBoolean({ message: 'Is active must be a boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Is default must be a boolean' })
  isDefault?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'Sort order must be a number' })
  sortOrder?: number;
}


