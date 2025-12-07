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
import { FinancialService } from './services';
import {
  CreateCurrencyDto,
  UpdateCurrencyDto,
  CurrencyResponseDto,
  CreateExchangeRateDto,
  UpdateExchangeRateDto,
  ExchangeRateResponseDto,
  ConvertCurrencyDto,
} from './dto';
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
  constructor(private readonly financialService: FinancialService) {}

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
}
