import {
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create Equipment Booking DTO
 */
export class CreateEquipmentBookingDto {
  @IsNumber()
  @Type(() => Number)
  equipmentId: number;

  @IsNumber()
  @Type(() => Number)
  employeeId: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  bookingPurpose?: string;

  @IsOptional()
  @IsString()
  bookingNotes?: string;
}
