import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  FinancialService,
  AccountingService,
  FinancialReportingService,
  BillingService,
  InvoiceGenerationService,
} from './services';
import {
  CreateCurrencyDto,
  UpdateCurrencyDto,
  CurrencyResponseDto,
  CreateExchangeRateDto,
  UpdateExchangeRateDto,
  ExchangeRateResponseDto,
  ConvertCurrencyDto,
  CreateAccountDto,
  CreateJournalEntryDto,
  AccountResponseDto,
  FinancialTransactionResponseDto,
  CreateBillingRuleDto,
  CreateRecurringInvoiceDto,
} from './dto';
import { BillingRule } from './entities/billing-rule.entity';
import { RecurringInvoice } from './entities/recurring-invoice.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * Financials Controller
 *
 * REST API endpoints for multi-currency support:
 * - Currency management (CRUD)
 * - Exchange rate management (CRUD, historical)
 * - Currency conversion (real-time, historical)
 * - Organization-specific currency preferences
 */
@Controller('financials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinancialsController {
  constructor(
    private readonly financialService: FinancialService,
    private readonly accountingService: AccountingService,
    private readonly reportingService: FinancialReportingService,
    private readonly billingService: BillingService,
    private readonly invoiceGenerationService: InvoiceGenerationService,
  ) {}

  // ========== Currency Endpoints ==========

  /**
   * Create a new currency
   * POST /financials/currencies
   */
  @Post('currencies')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'FINANCE')
  async createCurrency(
    @Body() createDto: CreateCurrencyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CurrencyResponseDto> {
    return this.financialService.createCurrency(createDto, user.userId);
  }

  /**
   * Get currency by ID
   * GET /financials/currencies/:id
   */
  @Get('currencies/:id')
  async getCurrency(@Param('id', ParseIntPipe) id: number): Promise<CurrencyResponseDto> {
    return this.financialService.getCurrencyById(id);
  }

  /**
   * Get currency by code
   * GET /financials/currencies/code/:code
   */
  @Get('currencies/code/:code')
  async getCurrencyByCode(@Param('code') code: string): Promise<CurrencyResponseDto> {
    return this.financialService.getCurrencyByCode(code);
  }

  /**
   * Update currency
   * PUT /financials/currencies/:id
   */
  @Put('currencies/:id')
  @Roles('ADMIN', 'HR', 'FINANCE')
  async updateCurrency(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCurrencyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CurrencyResponseDto> {
    return this.financialService.updateCurrency(id, updateDto, user.userId);
  }

  /**
   * Delete currency
   * DELETE /financials/currencies/:id
   */
  @Delete('currencies/:id')
  @Roles('ADMIN', 'HR', 'FINANCE')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCurrency(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.financialService.deleteCurrency(id);
  }

  /**
   * Get all active currencies
   * GET /financials/currencies
   */
  @Get('currencies')
  async getActiveCurrencies(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number | null,
  ): Promise<CurrencyResponseDto[]> {
    return this.financialService.getActiveCurrencies(organizationId);
  }

  /**
   * Get currencies by organization
   * GET /financials/organizations/:organizationId/currencies
   */
  @Get('organizations/:organizationId/currencies')
  async getCurrenciesByOrganization(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ): Promise<CurrencyResponseDto[]> {
    return this.financialService.getCurrenciesByOrganization(organizationId);
  }

  /**
   * Get default currency for organization
   * GET /financials/organizations/:organizationId/currencies/default
   */
  @Get('organizations/:organizationId/currencies/default')
  async getDefaultCurrency(
    @Param('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number | null,
  ): Promise<CurrencyResponseDto | null> {
    return this.financialService.getDefaultCurrency(organizationId);
  }

  // ========== Exchange Rate Endpoints ==========

  /**
   * Create a new exchange rate
   * POST /financials/exchange-rates
   */
  @Post('exchange-rates')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'FINANCE')
  async createExchangeRate(
    @Body() createDto: CreateExchangeRateDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExchangeRateResponseDto> {
    return this.financialService.createExchangeRate(createDto, user.userId);
  }

  /**
   * Get exchange rate by ID
   * GET /financials/exchange-rates/:id
   */
  @Get('exchange-rates/:id')
  async getExchangeRate(@Param('id', ParseIntPipe) id: number): Promise<ExchangeRateResponseDto> {
    return this.financialService.getExchangeRateById(id);
  }

  /**
   * Update exchange rate
   * PUT /financials/exchange-rates/:id
   */
  @Put('exchange-rates/:id')
  @Roles('ADMIN', 'HR', 'FINANCE')
  async updateExchangeRate(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateExchangeRateDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExchangeRateResponseDto> {
    return this.financialService.updateExchangeRate(id, updateDto, user.userId);
  }

  /**
   * Delete exchange rate
   * DELETE /financials/exchange-rates/:id
   */
  @Delete('exchange-rates/:id')
  @Roles('ADMIN', 'HR', 'FINANCE')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteExchangeRate(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.financialService.deleteExchangeRate(id);
  }

  /**
   * Get current exchange rate for currency pair
   * GET /financials/exchange-rates/current
   */
  @Get('exchange-rates/current')
  async getCurrentExchangeRate(
    @Query('fromCurrencyId', ParseIntPipe) fromCurrencyId: number,
    @Query('toCurrencyId', ParseIntPipe) toCurrencyId: number,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number | null,
  ): Promise<ExchangeRateResponseDto | null> {
    return this.financialService.getCurrentExchangeRate(
      fromCurrencyId,
      toCurrencyId,
      organizationId,
    );
  }

  /**
   * Get exchange rates for currency pair
   * GET /financials/exchange-rates/pair
   */
  @Get('exchange-rates/pair')
  async getExchangeRatesByPair(
    @Query('fromCurrencyId', ParseIntPipe) fromCurrencyId: number,
    @Query('toCurrencyId', ParseIntPipe) toCurrencyId: number,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number | null,
  ): Promise<ExchangeRateResponseDto[]> {
    return this.financialService.getExchangeRatesByPair(
      fromCurrencyId,
      toCurrencyId,
      organizationId,
    );
  }

  // ========== Currency Conversion Endpoints ==========

  /**
   * Convert currency
   * POST /financials/convert
   */
  @Post('convert')
  async convertCurrency(@Body() convertDto: ConvertCurrencyDto) {
    return this.financialService.convertCurrency(convertDto);
  }

  // ========== Accounting Endpoints ==========

  /**
   * Create a new account
   * POST /financials/accounts
   */
  @Post('accounts')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'FINANCE')
  async createAccount(
    @Body() createDto: CreateAccountDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AccountResponseDto> {
    // This would be implemented in FinancialService
    throw new Error('Not implemented yet');
  }

  /**
   * Get account by ID
   * GET /financials/accounts/:id
   */
  @Get('accounts/:id')
  async getAccount(@Param('id', ParseIntPipe) id: number): Promise<AccountResponseDto> {
    // This would be implemented in FinancialService
    throw new Error('Not implemented yet');
  }

  /**
   * Get all active accounts
   * GET /financials/accounts
   */
  @Get('accounts')
  async getAccounts(): Promise<AccountResponseDto[]> {
    // This would be implemented in FinancialService
    throw new Error('Not implemented yet');
  }

  /**
   * Create a journal entry
   * POST /financials/journal-entries
   */
  @Post('journal-entries')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'FINANCE')
  async createJournalEntry(
    @Body() createDto: CreateJournalEntryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<FinancialTransactionResponseDto> {
    const transaction = await this.accountingService.createJournalEntry(
      new Date(createDto.transactionDate),
      createDto.description,
      createDto.lineItems,
      createDto.memo,
      user.userId,
    );

    return FinancialTransactionResponseDto.fromEntity(transaction, true);
  }

  /**
   * Post a transaction
   * POST /financials/transactions/:id/post
   */
  @Post('transactions/:id/post')
  @Roles('ADMIN', 'HR', 'FINANCE')
  async postTransaction(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<FinancialTransactionResponseDto> {
    const transaction = await this.accountingService.postTransaction(id, user.userId);
    return FinancialTransactionResponseDto.fromEntity(transaction, true);
  }

  /**
   * Reverse a transaction
   * POST /financials/transactions/:id/reverse
   */
  @Post('transactions/:id/reverse')
  @Roles('ADMIN', 'HR', 'FINANCE')
  async reverseTransaction(
    @Param('id', ParseIntPipe) id: number,
    @Body('reversalDate') reversalDate: string,
    @Body('description') description: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<FinancialTransactionResponseDto> {
    const transaction = await this.accountingService.reverseTransaction(
      id,
      new Date(reversalDate),
      description,
      user.userId,
    );

    return FinancialTransactionResponseDto.fromEntity(transaction, true);
  }

  /**
   * Get transaction by ID
   * GET /financials/transactions/:id
   */
  @Get('transactions/:id')
  async getTransaction(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<FinancialTransactionResponseDto> {
    const transaction = await this.accountingService.getTransactionById(id);
    return FinancialTransactionResponseDto.fromEntity(transaction, true);
  }

  /**
   * Get transactions by date range
   * GET /financials/transactions
   */
  @Get('transactions')
  async getTransactions(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<FinancialTransactionResponseDto[]> {
    const transactions = await this.accountingService.getTransactionsByDateRange(
      new Date(startDate),
      new Date(endDate),
    );

    return transactions.map((t) => FinancialTransactionResponseDto.fromEntity(t, true));
  }

  // ========== Reporting Endpoints ==========

  /**
   * Generate Profit & Loss statement
   * GET /financials/reports/profit-loss
   */
  @Get('reports/profit-loss')
  @Roles('ADMIN', 'HR', 'FINANCE')
  async getProfitAndLoss(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.reportingService.generateProfitAndLoss(new Date(startDate), new Date(endDate));
  }

  /**
   * Generate Balance Sheet
   * GET /financials/reports/balance-sheet
   */
  @Get('reports/balance-sheet')
  @Roles('ADMIN', 'HR', 'FINANCE')
  async getBalanceSheet(@Query('asOfDate') asOfDate: string) {
    return this.reportingService.generateBalanceSheet(new Date(asOfDate));
  }

  /**
   * Generate Trial Balance
   * GET /financials/reports/trial-balance
   */
  @Get('reports/trial-balance')
  @Roles('ADMIN', 'HR', 'FINANCE')
  async getTrialBalance(@Query('asOfDate') asOfDate: string) {
    return this.reportingService.generateTrialBalance(new Date(asOfDate));
  }

  /**
   * Get account summary
   * GET /financials/accounts/:id/summary
   */
  @Get('accounts/:id/summary')
  async getAccountSummary(
    @Param('id', ParseIntPipe) id: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportingService.getAccountSummary(
      id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ========== Billing & Invoicing Endpoints ==========

  /**
   * Create a billing rule
   * POST /financials/billing-rules
   */
  @Post('billing-rules')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'FINANCE')
  async createBillingRule(
    @Body() createDto: CreateBillingRuleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const ruleData: Partial<BillingRule> = {
      ...createDto,
      billingPeriodStart: createDto.billingPeriodStart ? new Date(createDto.billingPeriodStart) : null,
      billingPeriodEnd: createDto.billingPeriodEnd ? new Date(createDto.billingPeriodEnd) : null,
      recurrenceEndDate: createDto.recurrenceEndDate ? new Date(createDto.recurrenceEndDate) : null,
      nextBillingDate: createDto.nextBillingDate ? new Date(createDto.nextBillingDate) : null,
    };
    return this.billingService.createBillingRule(ruleData, user.userId);
  }

  /**
   * Get billing rule by ID
   * GET /financials/billing-rules/:id
   */
  @Get('billing-rules/:id')
  async getBillingRule(@Param('id', ParseIntPipe) id: number) {
    return this.billingService.getBillingRuleById(id);
  }

  /**
   * Get active billing rules
   * GET /financials/billing-rules
   */
  @Get('billing-rules')
  async getBillingRules() {
    return this.billingService.getActiveBillingRules();
  }

  /**
   * Create a recurring invoice schedule
   * POST /financials/recurring-invoices
   */
  @Post('recurring-invoices')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'FINANCE')
  async createRecurringInvoice(
    @Body() createDto: CreateRecurringInvoiceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const scheduleData: Partial<RecurringInvoice> = {
      ...createDto,
      recurrenceEndDate: createDto.recurrenceEndDate ? new Date(createDto.recurrenceEndDate) : null,
      nextInvoiceDate: new Date(createDto.nextInvoiceDate),
    };
    return this.billingService.createRecurringInvoice(scheduleData, user.userId);
  }

  /**
   * Get recurring invoice by ID
   * GET /financials/recurring-invoices/:id
   */
  @Get('recurring-invoices/:id')
  async getRecurringInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.billingService.getRecurringInvoiceById(id);
  }

  /**
   * Get active recurring invoices
   * GET /financials/recurring-invoices
   */
  @Get('recurring-invoices')
  async getRecurringInvoices() {
    return this.billingService.getActiveRecurringInvoices();
  }

  /**
   * Execute billing (generate invoices for due schedules)
   * POST /financials/billing/execute
   */
  @Post('billing/execute')
  @Roles('ADMIN', 'HR', 'FINANCE')
  async executeBilling(@Query('date') date?: string) {
    return this.billingService.executeBilling(date ? new Date(date) : undefined);
  }

  /**
   * Generate recurring invoices
   * POST /financials/invoices/generate-recurring
   */
  @Post('invoices/generate-recurring')
  @Roles('ADMIN', 'HR', 'FINANCE')
  async generateRecurringInvoices(@Query('date') date?: string) {
    return this.invoiceGenerationService.generateRecurringInvoices(
      date ? new Date(date) : undefined,
    );
  }

  /**
   * Send invoice
   * POST /financials/invoices/:id/send
   */
  @Post('invoices/:id/send')
  @Roles('ADMIN', 'HR', 'FINANCE')
  async sendInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body('deliveryMethod') deliveryMethod = 'EMAIL',
  ) {
    return this.invoiceGenerationService.sendInvoice(id, deliveryMethod);
  }
}
