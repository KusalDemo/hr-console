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
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus, TaskPriority, TaskType, RecurrencePattern } from '../entities/task.entity';

/**
 * Update Task DTO
 */
export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  parentTaskId?: number;

  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  assigneeId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  reporterId?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  additionalAssigneeIds?: number[];

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  actualStartDate?: string;

  @IsOptional()
  @IsDateString()
  completionDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  actualHours?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  remainingHours?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  storyPoints?: number;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsEnum(RecurrencePattern)
  recurrencePattern?: RecurrencePattern;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  recurrenceInterval?: number;

  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @IsOptional()
  @IsDateString()
  nextOccurrenceDate?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsObject()
  taskMetadata?: Record<string, any>;
}


