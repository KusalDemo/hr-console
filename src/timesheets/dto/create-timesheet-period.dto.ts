import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { PeriodType } from '../entities/timesheet-period.entity';

/**
 * Create Timesheet Period DTO
 */
export class CreateTimesheetPeriodDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  periodKey: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  periodName: string;

  @IsEnum(PeriodType)
  periodType: PeriodType;

  @IsDateString()
  startDate: string;

  @IsNumber()
  daysInPeriod: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  organizationId?: number;
}


