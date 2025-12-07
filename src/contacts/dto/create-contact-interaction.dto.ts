import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InteractionType, InteractionDirection } from '../entities/contact-interaction.entity';

/**
 * Create Contact Interaction DTO
 */
export class CreateContactInteractionDto {
  @IsEnum(InteractionType)
  interactionType: InteractionType;

  @IsEnum(InteractionDirection)
  direction: InteractionDirection;

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  interactionDate: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  employeeId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  relatedEntityId?: number;

  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  nextAction?: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;

  @IsOptional()
  @IsObject()
  interactionMetadata?: Record<string, any>;
}

