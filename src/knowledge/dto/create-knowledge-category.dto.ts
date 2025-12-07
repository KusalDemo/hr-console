import { IsString, IsOptional, IsNumber, MinLength, MaxLength, IsObject } from 'class-validator';

/**
 * Create Knowledge Category DTO
 */
export class CreateKnowledgeCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  parentId?: number;

  @IsOptional()
  @IsNumber()
  organizationId?: number;

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
