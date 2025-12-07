import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CurrencyRepository, ExchangeRateRepository } from '../repositories';
import { Currency } from '../entities/currency.entity';
import { ExchangeRate } from '../entities/exchange-rate.entity';

/**
 * Currency Conversion Service
 * 
 * Provides currency conversion capabilities with:
 * - Real-time conversions using current exchange rates
 * - Historical conversions using historical rates
 * - Caching for frequently accessed rates
 * - Support for organization-specific rates
 * - Bid/ask rate support for buy/sell operations
 */
@Injectable()
export class CurrencyConversionService {
  private readonly logger = new Logger(CurrencyConversionService.name);

  // Simple in-memory cache for exchange rates (TTL: 5 minutes)
  private readonly rateCache = new Map<string, { rate: ExchangeRate; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly currencyRepository: CurrencyRepository,
    private readonly exchangeRateRepository: ExchangeRateRepository,
  ) {}

  /**
   * Convert amount from one currency to another (real-time)
   */
  async convert(
    amount: number,
    fromCurrencyCode: string,
    toCurrencyCode: string,
    date?: Date,
    organizationId?: number | null,
    useBidAsk = false,
  ): Promise<{
    amount: number;
    fromCurrency: Currency;
    toCurrency: Currency;
    rate: number;
    convertedAmount: number;
    date: Date;
  }> {
    if (fromCurrencyCode === toCurrencyCode) {
      const currency = await this.currencyRepository.findByCode(fromCurrencyCode);
      if (!currency) {
        throw new NotFoundException(`Currency ${fromCurrencyCode} not found`);
      }
      return {
        amount,
        fromCurrency: currency,
        toCurrency: currency,
        rate: 1,
        convertedAmount: amount,
        date: date || new Date(),
      };
    }

    const fromCurrency = await this.currencyRepository.findByCode(fromCurrencyCode);
    if (!fromCurrency) {
      throw new NotFoundException(`Currency ${fromCurrencyCode} not found`);
    }

    const toCurrency = await this.currencyRepository.findByCode(toCurrencyCode);
    if (!toCurrency) {
      throw new NotFoundException(`Currency ${toCurrencyCode} not found`);
    }

    const conversionDate = date || new Date();
    const rate = await this.getExchangeRate(
      fromCurrency.id,
      toCurrency.id,
      conversionDate,
      organizationId,
    );

    if (!rate) {
      throw new NotFoundException(
        `Exchange rate not found for ${fromCurrencyCode} to ${toCurrencyCode} on ${conversionDate.toISOString()}`,
      );
    }

    const convertedAmount = rate.convert(amount, useBidAsk);

    this.logger.debug(
      `Converted ${amount} ${fromCurrencyCode} to ${convertedAmount.toFixed(toCurrency.decimalPlaces)} ${toCurrencyCode} at rate ${rate.rate}`,
    );

    return {
      amount,
      fromCurrency,
      toCurrency,
      rate: rate.rate,
      convertedAmount,
      date: conversionDate,
    };
  }

  /**
   * Convert amount using historical rate
   */
  async convertHistorical(
    amount: number,
    fromCurrencyCode: string,
    toCurrencyCode: string,
    date: Date,
    organizationId?: number | null,
  ): Promise<{
    amount: number;
    fromCurrency: Currency;
    toCurrency: Currency;
    rate: number;
    convertedAmount: number;
    date: Date;
  }> {
    return this.convert(amount, fromCurrencyCode, toCurrencyCode, date, organizationId);
  }

  /**
   * Get exchange rate for currency pair
   */
  async getExchangeRate(
    fromCurrencyId: number,
    toCurrencyId: number,
    date?: Date,
    organizationId?: number | null,
  ): Promise<ExchangeRate | null> {
    const conversionDate = date || new Date();
    const cacheKey = this.buildCacheKey(
      fromCurrencyId,
      toCurrencyId,
      conversionDate,
      organizationId,
    );

    // Check cache
    const cached = this.rateCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(`Cache hit for exchange rate: ${cacheKey}`);
      return cached.rate;
    }

    // Try direct rate
    let rate = await this.exchangeRateRepository.findCurrentRate(
      fromCurrencyId,
      toCurrencyId,
      conversionDate,
      organizationId,
    );

    // If not found, try inverse rate
    if (!rate) {
      const inverseRate = await this.exchangeRateRepository.findCurrentRate(
        toCurrencyId,
        fromCurrencyId,
        conversionDate,
        organizationId,
      );

      if (inverseRate) {
        // Create a virtual rate object for inverse conversion
        rate = {
          ...inverseRate,
          fromCurrencyId,
          toCurrencyId,
          rate: inverseRate.getInverseRate(),
        } as ExchangeRate;
      }
    }

    // If still not found, try USD as intermediate currency
    if (!rate) {
      const usdCurrency = await this.currencyRepository.findByCode('USD');
      if (usdCurrency) {
        const fromToUsd = await this.exchangeRateRepository.findCurrentRate(
          fromCurrencyId,
          usdCurrency.id,
          conversionDate,
          organizationId,
        );
        const usdToTo = await this.exchangeRateRepository.findCurrentRate(
          usdCurrency.id,
          toCurrencyId,
          conversionDate,
          organizationId,
        );

        if (fromToUsd && usdToTo) {
          // Create virtual rate for cross-currency conversion
          rate = {
            ...fromToUsd,
            fromCurrencyId,
            toCurrencyId,
            rate: fromToUsd.rate * usdToTo.rate,
          } as ExchangeRate;
        }
      }
    }

    // Cache the rate
    if (rate) {
      this.rateCache.set(cacheKey, {
        rate,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });
    }

    return rate;
  }

  /**
   * Get exchange rate for specific date (historical)
   */
  async getHistoricalRate(
    fromCurrencyId: number,
    toCurrencyId: number,
    date: Date,
    organizationId?: number | null,
  ): Promise<ExchangeRate | null> {
    return this.exchangeRateRepository.findRateForDate(
      fromCurrencyId,
      toCurrencyId,
      date,
      organizationId,
    );
  }

  /**
   * Convert multiple amounts in batch
   */
  async convertBatch(
    conversions: Array<{
      amount: number;
      fromCurrencyCode: string;
      toCurrencyCode: string;
      date?: Date;
    }>,
    organizationId?: number | null,
  ): Promise<Array<{
    amount: number;
    fromCurrency: Currency;
    toCurrency: Currency;
    rate: number;
    convertedAmount: number;
    date: Date;
  }>> {
    const results = await Promise.all(
      conversions.map((conv) =>
        this.convert(
          conv.amount,
          conv.fromCurrencyCode,
          conv.toCurrencyCode,
          conv.date,
          organizationId,
        ),
      ),
    );

    return results;
  }

  /**
   * Clear exchange rate cache
   */
  clearCache(): void {
    this.rateCache.clear();
    this.logger.debug('Exchange rate cache cleared');
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.rateCache.entries()) {
      if (value.expiresAt <= now) {
        this.rateCache.delete(key);
      }
    }
  }

  /**
   * Build cache key for exchange rate
   */
  private buildCacheKey(
    fromCurrencyId: number,
    toCurrencyId: number,
    date: Date,
    organizationId?: number | null,
  ): string {
    const dateStr = date.toISOString().split('T')[0];
    const orgStr = organizationId !== undefined ? `_org_${organizationId}` : '_global';
    return `rate_${fromCurrencyId}_${toCurrencyId}_${dateStr}${orgStr}`;
  }
}
