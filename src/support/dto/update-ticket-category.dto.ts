import { PartialType } from '@nestjs/mapped-types';
import { CreateTicketCategoryDto } from './create-ticket-category.dto';
import { IsOptional, IsBoolean } from 'class-validator';

/**
 * Update Ticket Category DTO
 */
export class UpdateTicketCategoryDto extends PartialType(CreateTicketCategoryDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
