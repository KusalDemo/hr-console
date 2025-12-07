import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsArray,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GoalType, GoalStatus, GoalPriority } from '../entities/goal.entity';

/**
 * Create Goal DTO
 */
export class CreateGoalDto {
  @IsString()
  goalTitle: string;

  @IsOptional()
  @IsString()
  goalDescription?: string;

  @IsEnum(GoalType)
  goalType: GoalType;

  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;

  @IsOptional()
  @IsEnum(GoalPriority)
  priority?: GoalPriority;

  @IsNumber()
  @Type(() => Number)
  organizationId: number;

  @IsNumber()
  @Type(() => Number)
  ownerId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  departmentId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  teamId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  parentGoalId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  templateId?: number;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @IsDateString()
  targetCompletionDate?: string;

  @IsOptional()
  @IsString()
  checkInFrequency?: string;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  milestones?: Array<{
    id: string;
    title: string;
    description?: string;
    targetDate: string;
    completed?: boolean;
  }>;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  metrics?: Array<{
    id: string;
    name: string;
    unit: string;
    targetValue: number;
    formula?: string;
  }>;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  progressPercentage?: number;

  @IsOptional()
  @IsObject()
  goalMetadata?: Record<string, any>;
}
