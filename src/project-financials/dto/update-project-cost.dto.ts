import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CostType, CostStatus } from '../entities/project-cost.entity';

/**
 * Update Project Cost DTO
 */
export class UpdateProjectCostDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  budgetLineId?: number;

  @IsOptional()
  @IsEnum(CostType)
  costType?: CostType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  costAmount?: number;

  @IsOptional()
  @IsDateString()
  costDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  employeeId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  hours?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taskId?: number;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  receiptReference?: string;

  @IsOptional()
  @IsEnum(CostStatus)
  status?: CostStatus;

  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  billingRate?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  billingAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsObject()
  costMetadata?: Record<string, any>;
}


