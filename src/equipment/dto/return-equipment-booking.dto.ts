import { IsOptional, IsString } from 'class-validator';

/**
 * Return Equipment Booking DTO
 */
export class ReturnEquipmentBookingDto {
  @IsOptional()
  @IsString()
  conditionAtReturn?: string;

  @IsOptional()
  @IsString()
  returnNotes?: string;
}
