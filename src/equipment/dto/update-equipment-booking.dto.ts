import { IsOptional, IsDateString, IsString } from 'class-validator';

/**
 * Update Equipment Booking DTO
 */
export class UpdateEquipmentBookingDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  bookingPurpose?: string;

  @IsOptional()
  @IsString()
  bookingNotes?: string;
}
