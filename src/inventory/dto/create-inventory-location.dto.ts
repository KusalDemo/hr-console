import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create Inventory Location DTO
 */
export class CreateInventoryLocationDto {
  @IsString()
  locationName: string;

  @IsOptional()
  @IsString()
  locationCode?: string;

  @IsOptional()
  @IsString()
  locationDescription?: string;

  @IsNumber()
  @Type(() => Number)
  organizationId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  parentLocationId?: number;

  @IsOptional()
  @IsString()
  locationType?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsObject()
  locationMetadata?: Record<string, any>;
}
