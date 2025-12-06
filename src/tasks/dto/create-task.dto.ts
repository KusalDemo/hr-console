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
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus, TaskPriority, TaskType, RecurrencePattern } from '../entities/task.entity';
import { DependencyType } from '../entities/task-dependency.entity';

/**
 * Create Task Dependency DTO
 */
export class CreateTaskDependencyDto {
  @IsNumber()
  @Type(() => Number)
  dependsOnTaskId: number;

  @IsEnum(DependencyType)
  dependencyType: DependencyType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  lagHours?: number;

  @IsOptional()
  @IsBoolean()
  isHardDependency?: boolean;
}

/**
 * Create Task DTO
 */
export class CreateTaskDto {
  @IsString()
  taskKey: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  projectId?: number;

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
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  storyPoints?: number;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

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
  @IsString()
  tags?: string;

  @IsOptional()
  @IsObject()
  taskMetadata?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskDependencyDto)
  dependencies?: CreateTaskDependencyDto[];
}

