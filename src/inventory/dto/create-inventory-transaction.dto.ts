import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '../entities/inventory-transaction.entity';

/**
 * Create Inventory Transaction DTO
 */
export class CreateInventoryTransactionDto {
  @IsNumber()
  @Type(() => Number)
  itemId: number;

  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @IsNumber()
  @Type(() => Number)
  @Min(0.01)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  locationId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  toLocationId?: number;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serialNumbers?: string[];

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;
}
