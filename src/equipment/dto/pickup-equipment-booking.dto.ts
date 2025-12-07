import { IsOptional, IsString } from 'class-validator';

/**
 * Pickup Equipment Booking DTO
 */
export class PickupEquipmentBookingDto {
  @IsOptional()
  @IsString()
  conditionAtPickup?: string;
}
