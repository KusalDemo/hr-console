import { IsEnum } from 'class-validator';
import { TicketStatus } from '../entities/support-ticket.entity';

/**
 * Update Ticket Status DTO
 */
export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;
}
