import { IsOptional, IsString } from 'class-validator';

/**
 * Approve Equipment Booking DTO
 */
export class ApproveEquipmentBookingDto {
  @IsOptional()
  @IsString()
  approvalComments?: string;
}
