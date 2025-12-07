import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  JobPriority,
  JobStatus,
} from '../entities/job-queue.entity';

/**
 * Update Job DTO
 */
export class UpdateJobDto {
  @IsOptional()
  @IsString()
  jobName?: string;

  @IsOptional()
  @IsString()
  jobDescription?: string;

  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;

  @IsOptional()
  @IsObject()
  jobData?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  dependencies?: number[];

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxRetries?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  retryDelay?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  timeout?: number;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsObject()
  jobMetadata?: Record<string, any>;
}
