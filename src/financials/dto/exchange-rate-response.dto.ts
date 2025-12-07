import { ExchangeRate, ExchangeRateSource } from '../entities/exchange-rate.entity';

/**
 * Exchange Rate Response DTO
 */
export class ExchangeRateResponseDto {
  id: number;
  fromCurrencyId: number;
  toCurrencyId: number;
  rate: number;
  bidRate: number | null;
  askRate: number | null;
  effectiveDate: Date;
  expiryDate: Date | null;
  source: ExchangeRateSource;
  organizationId: number | null;
  isDefault: boolean;
  notes: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  // Optional relations
  fromCurrency?: {
    id: number;
    code: string;
    name: string;
    symbol: string | null;
  };
  toCurrency?: {
    id: number;
    code: string;
    name: string;
    symbol: string | null;
  };

  static fromEntity(rate: ExchangeRate, includeRelations = false): ExchangeRateResponseDto {
    const dto = new ExchangeRateResponseDto();
    dto.id = rate.id;
    dto.fromCurrencyId = rate.fromCurrencyId;
    dto.toCurrencyId = rate.toCurrencyId;
    dto.rate = rate.rate;
    dto.bidRate = rate.bidRate;
    dto.askRate = rate.askRate;
    dto.effectiveDate = rate.effectiveDate;
    dto.expiryDate = rate.expiryDate;
    dto.source = rate.source;
    dto.organizationId = rate.organizationId;
    dto.isDefault = rate.isDefault;
    dto.notes = rate.notes;
    dto.metadata = rate.metadata;
    dto.createdAt = rate.createdAt;
    dto.updatedAt = rate.updatedAt;
    dto.createdBy = rate.createdBy;
    dto.updatedBy = rate.updatedBy;

    if (includeRelations && rate.fromCurrency) {
      dto.fromCurrency = {
        id: rate.fromCurrency.id,
        code: rate.fromCurrency.code,
        name: rate.fromCurrency.name,
        symbol: rate.fromCurrency.symbol,
      };
    }

    if (includeRelations && rate.toCurrency) {
      dto.toCurrency = {
        id: rate.toCurrency.id,
        code: rate.toCurrency.code,
        name: rate.toCurrency.name,
        symbol: rate.toCurrency.symbol,
      };
    }

    return dto;
  }
}
