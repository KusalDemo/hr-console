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
import { JobType, JobPriority } from '../entities/job-queue.entity';

/**
 * Create Job DTO
 */
export class CreateJobDto {
  @IsEnum(JobType)
  jobType: JobType;

  @IsString()
  jobName: string;

  @IsOptional()
  @IsString()
  jobDescription?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organizationId?: number;

  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;

  @IsObject()
  jobData: Record<string, any>;

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

