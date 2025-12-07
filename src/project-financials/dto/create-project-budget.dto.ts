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
 * Create Project Budget DTO
 */
export class CreateProjectBudgetDto {
  @IsNumber()
  @Type(() => Number)
  projectId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  version?: number;

  @IsString()
  name: string;

  @IsEnum(BudgetCategory)
  category: BudgetCategory;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  budgetedAmount: number;

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


