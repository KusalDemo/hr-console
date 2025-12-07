import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReviewCycleStatus } from '../entities/performance-review-cycle.entity';

/**
 * Create Review Cycle DTO
 */
export class CreateReviewCycleDto {
  @IsString()
  cycleName: string;

  @IsOptional()
  @IsString()
  cycleDescription?: string;

  @IsNumber()
  @Type(() => Number)
  organizationId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  departmentId?: number;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @IsDateString()
  selfAssessmentStart?: string;

  @IsOptional()
  @IsDateString()
  selfAssessmentEnd?: string;

  @IsOptional()
  @IsDateString()
  managerReviewStart?: string;

  @IsOptional()
  @IsDateString()
  managerReviewEnd?: string;

  @IsOptional()
  @IsDateString()
  calibrationStart?: string;

  @IsOptional()
  @IsDateString()
  calibrationEnd?: string;

  @IsOptional()
  @IsEnum(ReviewCycleStatus)
  status?: ReviewCycleStatus;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsObject()
  cycleMetadata?: Record<string, any>;
}
