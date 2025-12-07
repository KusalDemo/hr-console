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
  ParseBoolPipe,
} from '@nestjs/common';
import { KPIService } from './services/kpi.service';
import { KPICalculationService } from './services/kpi-calculation.service';
import {
  CreateKPIDefinitionDto,
  UpdateKPIDefinitionDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { KPICalculationType } from './entities/kpi-definition.entity';

/**
 * KPIs Controller
 * 
 * REST API endpoints for KPI and metrics management:
 * - KPI definitions (CRUD, search, categorization)
 * - KPI calculations
 * - Measurement tracking
 * - Statistics and forecasting
 * - Trend analysis
 */
@Controller('kpis')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KPIsController {
  constructor(
    private readonly kpiService: KPIService,
    private readonly kpiCalculationService: KPICalculationService,
  ) {}

  // ========== KPI Definition Endpoints ==========

  /**
   * Create a new KPI definition
   * POST /kpis
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async createKPIDefinition(
    @Body() createDto: CreateKPIDefinitionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.kpiService.createKPIDefinition(createDto, user.userId);
  }

  /**
   * Get KPI definition by ID
   * GET /kpis/:id
   */
  @Get(':id')
  async getKPIDefinition(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeMeasurements', new ParseBoolPipe({ optional: true })) includeMeasurements = false,
  ) {
    return this.kpiService.getKPIDefinitionById(id, includeMeasurements);
  }

  /**
   * Update KPI definition
   * PUT /kpis/:id
   */
  @Put(':id')
  @Roles('ADMIN', 'HR')
  async updateKPIDefinition(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateKPIDefinitionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.kpiService.updateKPIDefinition(id, updateDto, user.userId);
  }

  /**
   * Delete KPI definition (archive)
   * DELETE /kpis/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'HR')
  async deleteKPIDefinition(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.kpiService.deleteKPIDefinition(id, user.userId);
  }

  /**
   * Calculate KPI value
   * POST /kpis/:id/calculate
   */
  @Post(':id/calculate')
  @Roles('ADMIN', 'HR')
  async calculateKPI(@Param('id', ParseIntPipe) id: number) {
    return this.kpiCalculationService.calculateKPI(id);
  }

  /**
   * Calculate all pending KPIs
   * POST /kpis/calculate-all
   */
  @Post('calculate-all')
  @Roles('ADMIN', 'HR')
  async calculateAllPendingKPIs(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.kpiCalculationService.calculateAllPendingKPIs(organizationId);
  }

  /**
   * Get KPIs by organization
   * GET /kpis/organization/:organizationId
   */
  @Get('organization/:organizationId')
  async getKPIsByOrganization(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.kpiService.getKPIsByOrganization(organizationId, includeInactive);
  }

  /**
   * Get KPIs by category
   * GET /kpis/category/:category
   */
  @Get('category/:category')
  async getKPIsByCategory(
    @Param('category') category: string,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.kpiService.getKPIsByCategory(category, organizationId);
  }

  /**
   * Get KPIs needing calculation
   * GET /kpis/needing-calculation
   */
  @Get('needing-calculation')
  @Roles('ADMIN', 'HR')
  async getKPIsNeedingCalculation(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('beforeDate') beforeDate?: string,
  ) {
    return this.kpiService.getKPIsNeedingCalculation(
      organizationId,
      beforeDate ? new Date(beforeDate) : undefined,
    );
  }

  /**
   * Get KPIs by goal
   * GET /kpis/goal/:goalId
   */
  @Get('goal/:goalId')
  async getKPIsByGoal(@Param('goalId', ParseIntPipe) goalId: number) {
    return this.kpiService.getKPIsByGoal(goalId);
  }

  /**
   * Get KPIs by key result
   * GET /kpis/key-result/:keyResultId
   */
  @Get('key-result/:keyResultId')
  async getKPIsByKeyResult(@Param('keyResultId', ParseIntPipe) keyResultId: number) {
    return this.kpiService.getKPIsByKeyResult(keyResultId);
  }

  /**
   * Search KPIs
   * GET /kpis/search
   */
  @Get('search')
  async searchKPIs(
    @Query('searchTerm') searchTerm?: string,
    @Query('category') category?: string,
    @Query('calculationType') calculationType?: KPICalculationType,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.kpiService.searchKPIs({
      searchTerm,
      category,
      calculationType,
      organizationId,
      includeInactive,
    });
  }

  // ========== Measurement Endpoints ==========

  /**
   * Get latest measurement for KPI
   * GET /kpis/:id/latest-measurement
   */
  @Get(':id/latest-measurement')
  async getLatestMeasurement(@Param('id', ParseIntPipe) id: number) {
    return this.kpiService.getLatestMeasurement(id);
  }

  /**
   * Get measurements for KPI
   * GET /kpis/:id/measurements
   */
  @Get(':id/measurements')
  async getMeasurements(
    @Param('id', ParseIntPipe) id: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.kpiService.getMeasurements(
      id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Get measurement statistics
   * GET /kpis/:id/statistics
   */
  @Get(':id/statistics')
  async getMeasurementStatistics(
    @Param('id', ParseIntPipe) id: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.kpiService.getMeasurementStatistics(
      id,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * Get forecasted values
   * GET /kpis/:id/forecast
   */
  @Get(':id/forecast')
  @Roles('ADMIN', 'HR')
  async getForecast(
    @Param('id', ParseIntPipe) id: number,
    @Query('periods', new ParseIntPipe({ optional: true })) periods = 7,
    @Query('periodType') periodType: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.kpiCalculationService.getForecast(id, periods, periodType);
  }

  /**
   * Aggregate measurements by period
   * GET /kpis/:id/aggregate
   */
  @Get(':id/aggregate')
  async aggregateByPeriod(
    @Param('id', ParseIntPipe) id: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('period') period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'day',
  ) {
    return this.kpiCalculationService.aggregateByPeriod(
      id,
      new Date(startDate),
      new Date(endDate),
      period,
    );
  }
}
