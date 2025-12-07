import { IsString, IsOptional, IsNumber, IsDateString, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Convert Currency DTO
 */
export class ConvertCurrencyDto {
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  amount: number;

  @IsString()
  fromCurrencyCode: string;

  @IsString()
  toCurrencyCode: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organizationId?: number | null;

  @IsOptional()
  @IsBoolean()
  useBidAsk?: boolean;
}
