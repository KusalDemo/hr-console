import { Currency, CurrencyStatus } from '../entities/currency.entity';

/**
 * Currency Response DTO
 */
export class CurrencyResponseDto {
  id: number;
  code: string;
  name: string;
  symbol: string | null;
  decimalPlaces: number;
  status: CurrencyStatus;
  organizationId: number | null;
  isDefault: boolean;
  displayFormat: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  static fromEntity(currency: Currency): CurrencyResponseDto {
    const dto = new CurrencyResponseDto();
    dto.id = currency.id;
    dto.code = currency.code;
    dto.name = currency.name;
    dto.symbol = currency.symbol;
    dto.decimalPlaces = currency.decimalPlaces;
    dto.status = currency.status;
    dto.organizationId = currency.organizationId;
    dto.isDefault = currency.isDefault;
    dto.displayFormat = currency.displayFormat;
    dto.metadata = currency.metadata;
    dto.createdAt = currency.createdAt;
    dto.updatedAt = currency.updatedAt;
    dto.createdBy = currency.createdBy;
    dto.updatedBy = currency.updatedBy;
    return dto;
  }
}
