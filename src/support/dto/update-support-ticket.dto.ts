import { PartialType } from '@nestjs/mapped-types';
import { CreateSupportTicketDto } from './create-support-ticket.dto';

/**
 * Update Support Ticket DTO
 */
export class UpdateSupportTicketDto extends PartialType(CreateSupportTicketDto) {}
