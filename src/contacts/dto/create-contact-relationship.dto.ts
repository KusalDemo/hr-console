import { IsNumber, IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import {
  RelationshipType,
  RelationshipDirection,
  RelationshipStrength,
} from '../entities/contact-relationship.entity';

/**
 * Create Contact Relationship DTO
 */
export class CreateContactRelationshipDto {
  @IsNumber()
  @Type(() => Number)
  relatedContactId: number;

  @IsEnum(RelationshipType)
  relationshipType: RelationshipType;

  @IsOptional()
  @IsEnum(RelationshipDirection)
  relationshipDirection?: RelationshipDirection;

  @IsOptional()
  @IsEnum(RelationshipStrength)
  relationshipStrength?: RelationshipStrength;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}


