import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create Resource Booking DTO
 */
export class CreateResourceBookingDto {
  @IsNumber()
  @Type(() => Number)
  resourceId: number;

  @IsNumber()
  @Type(() => Number)
  bookedById: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organizationId?: number;

  @IsString()
  bookingTitle: string;

  @IsOptional()
  @IsString()
  bookingDescription?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  attendeeCount?: number;

  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  calendarEventId?: number;

  @IsOptional()
  @IsObject()
  recurrencePattern?: Record<string, any>;
}
