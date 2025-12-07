import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsArray,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventType, EventStatus } from '../entities/calendar-event.entity';

/**
 * Create Calendar Event DTO
 */
export class CreateCalendarEventDto {
  @IsNumber()
  @Type(() => Number)
  calendarId: number;

  @IsString()
  eventTitle: string;

  @IsOptional()
  @IsString()
  eventDescription?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsEnum(EventStatus)
  eventStatus?: EventStatus;

  @IsNumber()
  @Type(() => Number)
  organizerId: number;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  recurrenceRuleId?: number;

  @IsOptional()
  @IsString()
  reminderMinutes?: string; // JSON array

  @IsOptional()
  @IsString()
  eventUrl?: string;

  @IsOptional()
  @IsString()
  meetingNotes?: string;

  @IsOptional()
  @IsArray()
  attendees?: any[];

  @IsOptional()
  @IsObject()
  eventMetadata?: Record<string, any>;
}
