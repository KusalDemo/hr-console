import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create Timesheet Entry DTO
 */
export class CreateTimesheetEntryDto {
  @IsDateString()
  entryDate: string;

  @IsNumber()
  @Type(() => Number)
  hours: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  billable?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  projectId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taskId?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  billingRate?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  costRate?: number;

  @IsOptional()
  entryMetadata?: Record<string, any>;
}


