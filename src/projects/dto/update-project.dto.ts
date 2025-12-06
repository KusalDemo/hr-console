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
import { ProjectStatus, ProjectPriority, ProjectHealth } from '../entities/project.entity';

/**
 * Update Project DTO
 */
export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  parentProjectId?: number;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @IsOptional()
  @IsEnum(ProjectHealth)
  health?: ProjectHealth;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  actualCompletionDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  projectManagerId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  clientId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  budgetedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  budgetedHours?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  budgetedRevenue?: number;

  @IsOptional()
  @IsObject()
  projectMetadata?: Record<string, any>;
}

