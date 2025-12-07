import {
  IsString,
  IsOptional,
  IsNumber,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * Create Ticket Category DTO
 */
export class CreateTicketCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  organizationId?: number;

  @IsOptional()
  @IsNumber()
  defaultSlaId?: number;

  @IsOptional()
  @IsNumber()
  defaultAssigneeId?: number;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  icon?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
