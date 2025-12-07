import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketSLADto } from './create-ticket-sla.dto';
import { IsOptional, IsBoolean } from 'class-validator';

/**
 * Update Ticket SLA DTO
 */
export class UpdateTicketSLADto extends PartialType(CreateTicketSLADto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
