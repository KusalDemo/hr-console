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
 * Create Project Cost DTO
 */
export class CreateProjectCostDto {
  @IsNumber()
  @Type(() => Number)
  projectId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  budgetLineId?: number;

  @IsEnum(CostType)
  costType: CostType;

  @IsString()
  description: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  costAmount: number;

  @IsDateString()
  costDate: string;

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
  @IsNumber()
  @Type(() => Number)
  timeEntryId?: number;

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

