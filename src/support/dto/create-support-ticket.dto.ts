import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsObject,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { TicketPriority } from '../entities/support-ticket.entity';

/**
 * Create Support Ticket DTO
 */
export class CreateSupportTicketDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  subject: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsNumber()
  organizationId: number;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsNumber()
  assignedToId?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
