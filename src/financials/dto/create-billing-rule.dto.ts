import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsObject,
  Min,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BillingType,
  BillingFrequency,
  BillingTriggerType,
  PricingModel,
  RecurrencePattern,
  BillingRuleStatus,
} from '../entities/billing-rule.entity';

/**
 * Create Billing Rule DTO
 */
export class CreateBillingRuleDto {
  @IsString()
  ruleName: string;

  @IsString()
  @Length(1, 128)
  ruleKey: string;

  @IsEnum(BillingType)
  billingType: BillingType;

  @IsEnum(BillingFrequency)
  billingFrequency: BillingFrequency;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  billingInterval?: number;

  @IsEnum(BillingTriggerType)
  triggerType: BillingTriggerType;

  @IsOptional()
  @IsString()
  triggerEvent?: string | null;

  @IsString()
  sourceType: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sourceEntityId?: number | null;

  @IsOptional()
  @IsObject()
  sourceFilter?: Record<string, any>;

  @IsEnum(PricingModel)
  pricingModel: PricingModel;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  basePrice?: number | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  unitPrice?: number | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currencyId?: number | null;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsObject()
  pricingConfig?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsBoolean()
  taxIncluded?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsDateString()
  billingPeriodStart?: string | null;

  @IsOptional()
  @IsDateString()
  billingPeriodEnd?: string | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  billingDay?: number | null;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsEnum(RecurrencePattern)
  recurrencePattern?: RecurrencePattern | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  recurrenceInterval?: number | null;

  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  recurrenceCount?: number | null;

  @IsOptional()
  @IsDateString()
  nextBillingDate?: string | null;

  @IsOptional()
  @IsEnum(BillingRuleStatus)
  status?: BillingRuleStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  invoiceTemplateId?: number | null;

  @IsOptional()
  @IsBoolean()
  autoGenerateInvoice?: boolean;

  @IsOptional()
  @IsBoolean()
  autoSendInvoice?: boolean;

  @IsOptional()
  @IsString()
  paymentTerms?: string | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  dueDateDays?: number | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
