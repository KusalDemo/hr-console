import { IsString } from 'class-validator';

/**
 * Reject Equipment Booking DTO
 */
export class RejectEquipmentBookingDto {
  @IsString()
  rejectionReason: string;
}
