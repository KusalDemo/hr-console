import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialsController } from './financials.controller';
import {
  FinancialService,
  CurrencyConversionService,
  AccountingService,
  FinancialReportingService,
} from './services';
import {
  CurrencyRepository,
  ExchangeRateRepository,
  AccountRepository,
  FinancialTransactionRepository,
} from './repositories';
import {
  Currency,
  ExchangeRate,
  Account,
  FinancialTransaction,
  TransactionLineItem,
} from './entities';

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
      Account,
      FinancialTransaction,
      TransactionLineItem,
    ]),
  ],
  controllers: [FinancialsController],
  providers: [
    FinancialService,
    CurrencyConversionService,
    AccountingService,
    FinancialReportingService,
    CurrencyRepository,
    ExchangeRateRepository,
    AccountRepository,
    FinancialTransactionRepository,
  ],
  exports: [
    FinancialService,
    CurrencyConversionService,
    AccountingService,
    FinancialReportingService,
    CurrencyRepository,
    ExchangeRateRepository,
    AccountRepository,
    FinancialTransactionRepository,
  ],
})
export class FinancialsModule {}
