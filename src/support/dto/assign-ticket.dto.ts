import { IsOptional, IsNumber } from 'class-validator';

/**
 * Assign Ticket DTO
 */
export class AssignTicketDto {
  @IsOptional()
  @IsNumber()
  assignedToId?: number;
}
