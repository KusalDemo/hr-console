import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialsController } from './financials.controller';
import { FinancialService, CurrencyConversionService } from './services';
import { CurrencyRepository, ExchangeRateRepository } from './repositories';
import { Currency, ExchangeRate } from './entities';

/**
 * Financials Module
 * 
 * Provides multi-currency support with:
 * - Currency management (CRUD, organization preferences)
 * - Exchange rate management (historical tracking, organization-specific rates)
 * - Currency conversion (real-time, historical, batch)
 * - Caching for exchange rates
 * - Currency formatting and display rules
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Currency,
      ExchangeRate,
    ]),
  ],
  controllers: [FinancialsController],
  providers: [
    FinancialService,
    CurrencyConversionService,
    CurrencyRepository,
    ExchangeRateRepository,
  ],
  exports: [
    FinancialService,
    CurrencyConversionService,
    CurrencyRepository,
    ExchangeRateRepository,
  ],
})
export class FinancialsModule {}
