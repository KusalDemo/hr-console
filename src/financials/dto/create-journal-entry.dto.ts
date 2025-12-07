import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Journal Entry Line Item DTO
 */
export class JournalEntryLineItemDto {
  @IsNumber()
  @Type(() => Number)
  accountId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  debitAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  creditAmount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  memo?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  entityId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  projectId?: number;
}

/**
 * Create Journal Entry DTO
 */
export class CreateJournalEntryDto {
  @IsDateString()
  transactionDate: string;

  @IsString()
  description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineItemDto)
  lineItems: JournalEntryLineItemDto[];

  @IsOptional()
  @IsString()
  memo?: string;
}
