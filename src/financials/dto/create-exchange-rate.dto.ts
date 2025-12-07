import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExchangeRateSource } from '../entities/exchange-rate.entity';

/**
 * Create Exchange Rate DTO
 */
export class CreateExchangeRateDto {
  @IsNumber()
  @Type(() => Number)
  fromCurrencyId: number;

  @IsNumber()
  @Type(() => Number)
  toCurrencyId: number;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  rate: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  bidRate?: number | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  askRate?: number | null;

  @IsDateString()
  effectiveDate: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string | null;

  @IsOptional()
  @IsEnum(ExchangeRateSource)
  source?: ExchangeRateSource;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organizationId?: number | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
