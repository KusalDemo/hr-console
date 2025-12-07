import { PartialType } from '@nestjs/mapped-types';
import { CreateCurrencyDto } from './create-currency.dto';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsObject,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CurrencyStatus } from '../entities/currency.entity';

/**
 * Update Currency DTO
 */
export class UpdateCurrencyDto extends PartialType(CreateCurrencyDto) {
  @IsOptional()
  @IsString()
  @Length(3, 3)
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  symbol?: string | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(8)
  decimalPlaces?: number;

  @IsOptional()
  @IsEnum(CurrencyStatus)
  status?: CurrencyStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organizationId?: number | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  displayFormat?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
