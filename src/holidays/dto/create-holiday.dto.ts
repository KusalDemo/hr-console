import {
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HolidayType, Weekday } from '../entities/holiday.entity';

/**
 * Create Holiday DTO
 */
export class CreateHolidayDto {
  @IsNumber()
  @Type(() => Number)
  holidayCalendarId: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  holidayDate: string;

  @IsOptional()
  @IsDateString()
  observedDate?: string;

  @IsOptional()
  @IsEnum(HolidayType)
  holidayType?: HolidayType;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  recurrencePattern?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  recurrenceMonth?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  recurrenceDay?: number;

  @IsOptional()
  @IsEnum(Weekday)
  recurrenceWeekday?: Weekday;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  recurrenceWeek?: number;

  @IsOptional()
  @IsBoolean()
  isFloating?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  floatingAllocationDays?: number;

  @IsOptional()
  @IsString()
  observanceRule?: string;

  @IsOptional()
  @IsBoolean()
  isObserved?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
