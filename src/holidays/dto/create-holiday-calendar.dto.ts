import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
} from 'class-validator';
import { CalendarType } from '../entities/holiday-calendar.entity';
import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

/**
 * Create Holiday Calendar DTO
 */
export class CreateHolidayCalendarDto {
  @IsString()
  calendarKey: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  countryName?: string;

  @IsOptional()
  @IsString()
  regionCode?: string;

  @IsOptional()
  @IsString()
  regionName?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(CalendarType)
  calendarType?: CalendarType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organizationId?: number;

  @IsOptional()
  @IsBoolean()
  isCompanySpecific?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsFloatingHolidays?: boolean;

  @IsOptional()
  @IsObject()
  observanceRules?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
