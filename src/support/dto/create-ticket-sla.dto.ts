import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsEnum,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { SLATimeUnit } from '../entities/ticket-sla.entity';

/**
 * Create Ticket SLA DTO
 */
export class CreateTicketSLADto {
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

  @IsNumber()
  @Min(1)
  firstResponseTime: number;

  @IsEnum(SLATimeUnit)
  firstResponseTimeUnit: SLATimeUnit;

  @IsNumber()
  @Min(1)
  resolutionTime: number;

  @IsEnum(SLATimeUnit)
  resolutionTimeUnit: SLATimeUnit;

  @IsOptional()
  @IsObject()
  businessHours?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  businessHoursOnly?: boolean;

  @IsOptional()
  @IsObject()
  priorityOverrides?: Record<string, any>;

  @IsOptional()
  @IsObject()
  escalationRules?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
