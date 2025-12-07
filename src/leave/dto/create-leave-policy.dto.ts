import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AccrualMethod,
  AccrualFrequency,
  AccrualCalculationBasis,
  WaitingPeriodType,
  ProrationMethod,
} from '../entities/leave-policy.entity';

/**
 * Create Leave Policy DTO
 */
export class CreateLeavePolicyDto {
  @IsOptional()
  @IsString()
  policyKey?: string;

  @IsString()
  policyName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  effectiveStartDate: string;

  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsString()
  templateCategory?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  parentPolicyId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  probationaryPeriodDays?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  waitingPeriodDays?: number;

  @IsOptional()
  @IsEnum(WaitingPeriodType)
  waitingPeriodType?: WaitingPeriodType;

  @IsOptional()
  @IsEnum(AccrualMethod)
  accrualMethod?: AccrualMethod;

  @IsOptional()
  @IsEnum(AccrualFrequency)
  accrualFrequency?: AccrualFrequency;

  @IsOptional()
  @IsString()
  accrualCustomFormula?: string;

  @IsOptional()
  @IsDateString()
  accrualStartDate?: string;

  @IsOptional()
  @IsEnum(AccrualCalculationBasis)
  accrualCalculationBasis?: AccrualCalculationBasis;

  @IsOptional()
  @IsBoolean()
  allowCarryOver?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  carryOverPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  carryOverMaxDays?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  carryOverExpiryDays?: number;

  @IsOptional()
  @IsDateString()
  carryOverExpiryDate?: string;

  @IsOptional()
  @IsBoolean()
  allowNegativeBalance?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxNegativeBalanceDays?: number;

  @IsOptional()
  @IsBoolean()
  prorateOnHire?: boolean;

  @IsOptional()
  @IsBoolean()
  prorateOnTermination?: boolean;

  @IsOptional()
  @IsEnum(ProrationMethod)
  prorationMethod?: ProrationMethod;

  @IsOptional()
  @IsObject()
  policyMetadata?: Record<string, any>;
}
