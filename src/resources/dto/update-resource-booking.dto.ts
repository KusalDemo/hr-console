import { IsString, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Update Resource Booking DTO
 */
export class UpdateResourceBookingDto {
  @IsOptional()
  @IsString()
  bookingTitle?: string;

  @IsOptional()
  @IsString()
  bookingDescription?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  attendeeCount?: number;

  @IsOptional()
  @IsString()
  specialRequirements?: string;
}
