import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CalendarType, CalendarVisibility } from '../entities/calendar.entity';

/**
 * Create Calendar DTO
 */
export class CreateCalendarDto {
  @IsString()
  calendarName: string;

  @IsOptional()
  @IsString()
  calendarDescription?: string;

  @IsEnum(CalendarType)
  calendarType: CalendarType;

  @IsOptional()
  @IsEnum(CalendarVisibility)
  calendarVisibility?: CalendarVisibility;

  @IsNumber()
  @Type(() => Number)
  ownerId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organizationId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  teamId?: number;

  @IsOptional()
  @IsString()
  defaultTimezone?: string;

  @IsOptional()
  @IsString()
  calendarColor?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

