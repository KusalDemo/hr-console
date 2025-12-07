import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { CurrencyRepository, ExchangeRateRepository } from '../repositories';
import { CurrencyConversionService } from './currency-conversion.service';
import {
  CreateCurrencyDto,
  UpdateCurrencyDto,
  CurrencyResponseDto,
  CreateExchangeRateDto,
  UpdateExchangeRateDto,
  ExchangeRateResponseDto,
  ConvertCurrencyDto,
} from '../dto';
import { Currency, CurrencyStatus } from '../entities/currency.entity';
import { ExchangeRate, ExchangeRateSource } from '../entities/exchange-rate.entity';

/**
 * Financial Service
 *
 * Manages currencies and exchange rates with:
 * - Currency CRUD operations
 * - Exchange rate management
 * - Currency conversion
 * - Organization-specific currency preferences
 */
@Injectable()
export class FinancialService {
  private readonly logger = new Logger(FinancialService.name);

  constructor(
    private readonly currencyRepository: CurrencyRepository,
    private readonly exchangeRateRepository: ExchangeRateRepository,
    private readonly currencyConversionService: CurrencyConversionService,
  ) {}

  // ========== Currency Management ==========

  /**
   * Create a new currency
   */
  async createCurrency(
    createDto: CreateCurrencyDto,
    createdBy?: number,
  ): Promise<CurrencyResponseDto> {
    // Check if currency code already exists
    const existing = await this.currencyRepository.findByCode(createDto.code);
    if (existing) {
      throw new BadRequestException(`Currency with code ${createDto.code} already exists`);
    }

    // If setting as default, unset other defaults for the organization
    if (createDto.isDefault) {
      await this.unsetDefaultCurrency(createDto.organizationId);
    }

    const currency = this.currencyRepository.create({
      ...createDto,
      decimalPlaces: createDto.decimalPlaces ?? 2,
      status: createDto.status || CurrencyStatus.ACTIVE,
      createdBy,
    });

    const saved = await this.currencyRepository.save(currency);

    this.logger.log(`Created currency: ${saved.code} (${saved.name})`);

    return CurrencyResponseDto.fromEntity(saved);
  }

  /**
   * Update a currency
   */
  async updateCurrency(
    id: number,
    updateDto: UpdateCurrencyDto,
    updatedBy?: number,
  ): Promise<CurrencyResponseDto> {
    const currency = await this.currencyRepository.findById(id);

    if (!currency) {
      throw new NotFoundException(`Currency with ID ${id} not found`);
    }

    // Check if code is being changed and if new code already exists
    if (updateDto.code && updateDto.code !== currency.code) {
      const existing = await this.currencyRepository.findByCode(updateDto.code);
      if (existing) {
        throw new BadRequestException(`Currency with code ${updateDto.code} already exists`);
      }
    }

    // If setting as default, unset other defaults for the organization
    if (updateDto.isDefault && !currency.isDefault) {
      await this.unsetDefaultCurrency(updateDto.organizationId ?? currency.organizationId);
    }

    Object.assign(currency, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.currencyRepository.save(currency);

    this.logger.log(`Updated currency: ${saved.code}`);

    return CurrencyResponseDto.fromEntity(saved);
  }

  /**
   * Get currency by ID
   */
  async getCurrencyById(id: number): Promise<CurrencyResponseDto> {
    const currency = await this.currencyRepository.findById(id);

    if (!currency) {
      throw new NotFoundException(`Currency with ID ${id} not found`);
    }

    return CurrencyResponseDto.fromEntity(currency);
  }

  /**
   * Get currency by code
   */
  async getCurrencyByCode(code: string): Promise<CurrencyResponseDto> {
    const currency = await this.currencyRepository.findByCode(code);

    if (!currency) {
      throw new NotFoundException(`Currency with code ${code} not found`);
    }

    return CurrencyResponseDto.fromEntity(currency);
  }

  /**
   * Get all active currencies
   */
  async getActiveCurrencies(organizationId?: number | null): Promise<CurrencyResponseDto[]> {
    const currencies = await this.currencyRepository.findActive(organizationId);

    return currencies.map((currency) => CurrencyResponseDto.fromEntity(currency));
  }

  /**
   * Get currencies by organization
   */
  async getCurrenciesByOrganization(organizationId: number | null): Promise<CurrencyResponseDto[]> {
    const currencies = await this.currencyRepository.findByOrganization(organizationId);

    return currencies.map((currency) => CurrencyResponseDto.fromEntity(currency));
  }

  /**
   * Get default currency for organization
   */
  async getDefaultCurrency(organizationId?: number | null): Promise<CurrencyResponseDto | null> {
    const currency = await this.currencyRepository.findDefaultCurrency(organizationId);

    if (!currency) {
      return null;
    }

    return CurrencyResponseDto.fromEntity(currency);
  }

  /**
   * Delete a currency
   */
  async deleteCurrency(id: number): Promise<void> {
    const currency = await this.currencyRepository.findById(id);

    if (!currency) {
      throw new NotFoundException(`Currency with ID ${id} not found`);
    }

    // Check if currency has exchange rates
    const rates = await this.exchangeRateRepository.findByCurrency(currency.id);
    if (rates.length > 0) {
      throw new BadRequestException(
        `Cannot delete currency ${currency.code} because it has ${rates.length} exchange rates`,
      );
    }

    await this.currencyRepository.remove(currency);

    this.logger.log(`Deleted currency: ${currency.code}`);
  }

  // ========== Exchange Rate Management ==========

  /**
   * Create a new exchange rate
   */
  async createExchangeRate(
    createDto: CreateExchangeRateDto,
    createdBy?: number,
  ): Promise<ExchangeRateResponseDto> {
    // Validate currencies exist
    const fromCurrency = await this.currencyRepository.findById(createDto.fromCurrencyId);
    if (!fromCurrency) {
      throw new NotFoundException(`Currency with ID ${createDto.fromCurrencyId} not found`);
    }

    const toCurrency = await this.currencyRepository.findById(createDto.toCurrencyId);
    if (!toCurrency) {
      throw new NotFoundException(`Currency with ID ${createDto.toCurrencyId} not found`);
    }

    if (fromCurrency.id === toCurrency.id) {
      throw new BadRequestException('From and to currencies cannot be the same');
    }

    // If setting as default, unset other defaults for the currency pair
    if (createDto.isDefault) {
      await this.unsetDefaultExchangeRate(
        createDto.fromCurrencyId,
        createDto.toCurrencyId,
        createDto.organizationId,
      );
    }

    const rate = this.exchangeRateRepository.create({
      ...createDto,
      effectiveDate: new Date(createDto.effectiveDate),
      expiryDate: createDto.expiryDate ? new Date(createDto.expiryDate) : null,
      source: createDto.source || ExchangeRateSource.MANUAL,
      createdBy,
    });

    const saved = await this.exchangeRateRepository.save(rate);

    // Clear conversion cache
    this.currencyConversionService.clearCache();

    this.logger.log(
      `Created exchange rate: ${fromCurrency.code} to ${toCurrency.code} = ${saved.rate}`,
    );

    const reloaded = await this.exchangeRateRepository.findById(saved.id, true);
    if (!reloaded) {
      throw new NotFoundException(`Exchange rate not found after save`);
    }
    return ExchangeRateResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Update an exchange rate
   */
  async updateExchangeRate(
    id: number,
    updateDto: UpdateExchangeRateDto,
    updatedBy?: number,
  ): Promise<ExchangeRateResponseDto> {
    const rate = await this.exchangeRateRepository.findById(id);

    if (!rate) {
      throw new NotFoundException(`Exchange rate with ID ${id} not found`);
    }

    // If setting as default, unset other defaults for the currency pair
    if (updateDto.isDefault && !rate.isDefault) {
      await this.unsetDefaultExchangeRate(
        updateDto.fromCurrencyId ?? rate.fromCurrencyId,
        updateDto.toCurrencyId ?? rate.toCurrencyId,
        updateDto.organizationId ?? rate.organizationId,
      );
    }

    Object.assign(rate, {
      ...updateDto,
      effectiveDate: updateDto.effectiveDate
        ? new Date(updateDto.effectiveDate)
        : rate.effectiveDate,
      expiryDate: updateDto.expiryDate ? new Date(updateDto.expiryDate) : rate.expiryDate,
      updatedBy,
    });

    const saved = await this.exchangeRateRepository.save(rate);

    // Clear conversion cache
    this.currencyConversionService.clearCache();

    this.logger.log(`Updated exchange rate: ${id}`);

    const reloaded = await this.exchangeRateRepository.findById(saved.id, true);
    if (!reloaded) {
      throw new NotFoundException(`Exchange rate not found after save`);
    }
    return ExchangeRateResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Get exchange rate by ID
   */
  async getExchangeRateById(id: number): Promise<ExchangeRateResponseDto> {
    const rate = await this.exchangeRateRepository.findById(id, true);

    if (!rate) {
      throw new NotFoundException(`Exchange rate with ID ${id} not found`);
    }

    return ExchangeRateResponseDto.fromEntity(rate, true);
  }

  /**
   * Get current exchange rate for currency pair
   */
  async getCurrentExchangeRate(
    fromCurrencyId: number,
    toCurrencyId: number,
    organizationId?: number | null,
  ): Promise<ExchangeRateResponseDto | null> {
    const rate = await this.currencyConversionService.getExchangeRate(
      fromCurrencyId,
      toCurrencyId,
      undefined,
      organizationId,
    );

    if (!rate) {
      return null;
    }

    const reloaded = await this.exchangeRateRepository.findById(rate.id, true);
    if (!reloaded) {
      throw new NotFoundException(`Exchange rate with ID ${rate.id} not found after update`);
    }
    return ExchangeRateResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Get exchange rates for currency pair
   */
  async getExchangeRatesByPair(
    fromCurrencyId: number,
    toCurrencyId: number,
    organizationId?: number | null,
  ): Promise<ExchangeRateResponseDto[]> {
    const rates = await this.exchangeRateRepository.findByCurrencyPair(
      fromCurrencyId,
      toCurrencyId,
      organizationId,
    );

    return rates.map((rate) => ExchangeRateResponseDto.fromEntity(rate));
  }

  /**
   * Delete an exchange rate
   */
  async deleteExchangeRate(id: number): Promise<void> {
    const rate = await this.exchangeRateRepository.findById(id);

    if (!rate) {
      throw new NotFoundException(`Exchange rate with ID ${id} not found`);
    }

    await this.exchangeRateRepository.remove(rate);

    // Clear conversion cache
    this.currencyConversionService.clearCache();

    this.logger.log(`Deleted exchange rate: ${id}`);
  }

  // ========== Currency Conversion ==========

  /**
   * Convert currency
   */
  async convertCurrency(convertDto: ConvertCurrencyDto) {
    const date = convertDto.date ? new Date(convertDto.date) : undefined;

    const result = await this.currencyConversionService.convert(
      convertDto.amount,
      convertDto.fromCurrencyCode,
      convertDto.toCurrencyCode,
      date,
      convertDto.organizationId,
      convertDto.useBidAsk,
    );

    return {
      amount: convertDto.amount,
      fromCurrency: CurrencyResponseDto.fromEntity(result.fromCurrency),
      toCurrency: CurrencyResponseDto.fromEntity(result.toCurrency),
      rate: result.rate,
      convertedAmount: result.convertedAmount,
      date: result.date,
    };
  }

  // ========== Private Helper Methods ==========

  /**
   * Unset default currency for organization
   */
  private async unsetDefaultCurrency(organizationId?: number | null): Promise<void> {
    const defaultCurrency = await this.currencyRepository.findDefaultCurrency(organizationId);

    if (defaultCurrency) {
      defaultCurrency.isDefault = false;
      await this.currencyRepository.save(defaultCurrency);
    }
  }

  /**
   * Unset default exchange rate for currency pair
   */
  private async unsetDefaultExchangeRate(
    fromCurrencyId: number,
    toCurrencyId: number,
    organizationId?: number | null,
  ): Promise<void> {
    const rates = await this.exchangeRateRepository.findByCurrencyPair(
      fromCurrencyId,
      toCurrencyId,
      organizationId,
    );

    for (const rate of rates) {
      if (rate.isDefault) {
        rate.isDefault = false;
        await this.exchangeRateRepository.save(rate);
      }
    }
  }
}
