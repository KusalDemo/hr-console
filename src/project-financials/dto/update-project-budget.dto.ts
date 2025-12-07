import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BudgetCategory, BudgetStatus } from '../entities/project-budget.entity';

/**
 * Update Project Budget DTO
 */
export class UpdateProjectBudgetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(BudgetCategory)
  category?: BudgetCategory;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  budgetedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  committedAmount?: number;

  @IsOptional()
  @IsEnum(BudgetStatus)
  status?: BudgetStatus;

  @IsOptional()
  @IsDateString()
  periodStartDate?: string;

  @IsOptional()
  @IsDateString()
  periodEndDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  budgetMetadata?: Record<string, any>;
}


