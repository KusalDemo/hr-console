import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemType, ItemStatus } from '../entities/inventory-item.entity';

/**
 * Create Inventory Item DTO
 */
export class CreateInventoryItemDto {
  @IsString()
  sku: string;

  @IsString()
  itemName: string;

  @IsOptional()
  @IsString()
  itemDescription?: string;

  @IsEnum(ItemType)
  itemType: ItemType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ItemStatus)
  itemStatus?: ItemStatus;

  @IsNumber()
  @Type(() => Number)
  organizationId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  locationId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  reorderPoint?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  reorderQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxStockLevel?: number;

  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  costPerUnit?: number;

  @IsOptional()
  @IsString()
  valuationMethod?: string;

  @IsOptional()
  @IsBoolean()
  trackSerialNumbers?: boolean;

  @IsOptional()
  @IsBoolean()
  trackLotNumbers?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  parentItemId?: number;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  bundleComponents?: Array<{ itemId: number; quantity: number }>;

  @IsOptional()
  @IsObject()
  itemMetadata?: Record<string, any>;
}
