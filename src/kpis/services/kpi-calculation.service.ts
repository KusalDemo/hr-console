import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { KPIDefinitionRepository } from '../repositories/kpi-definition.repository';
import { KPIMeasurementRepository } from '../repositories/kpi-measurement.repository';
import {
  KPIDefinition,
  KPICalculationType,
  KPIDataSourceType,
  KPIFrequency,
} from '../entities/kpi-definition.entity';
import { KPIMeasurement } from '../entities/kpi-measurement.entity';

/**
 * KPI Calculation Service
 * 
 * Handles KPI calculation with:
 * - Calculation from data sources
 * - Aggregation
 * - Forecasting
 * - Trend analysis
 * - Scheduled calculation jobs
 */
@Injectable()
export class KPICalculationService {
  private readonly logger = new Logger(KPICalculationService.name);

  constructor(
    private readonly kpiDefinitionRepository: KPIDefinitionRepository,
    private readonly kpiMeasurementRepository: KPIMeasurementRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Calculate KPI value
   */
  async calculateKPI(kpiDefinitionId: number): Promise<KPIMeasurement> {
    const kpi = await this.kpiDefinitionRepository.findById(kpiDefinitionId);

    if (!kpi) {
      throw new NotFoundException(`KPI definition with ID ${kpiDefinitionId} not found`);
    }

    if (!kpi.isActive) {
      throw new BadRequestException(`KPI ${kpiDefinitionId} is not active`);
    }

    let value: number;
    let rawData: Record<string, any> | null = null;

    // Calculate value based on data source type
    switch (kpi.dataSourceType) {
      case KPIDataSourceType.DATABASE:
        value = await this.calculateFromDatabase(kpi);
        break;
      case KPIDataSourceType.FORMULA:
        value = await this.calculateFromFormula(kpi);
        break;
      case KPIDataSourceType.GOAL:
        value = await this.calculateFromGoal(kpi);
        break;
      case KPIDataSourceType.MANUAL:
        throw new BadRequestException('Manual KPIs cannot be calculated automatically');
      default:
        throw new BadRequestException(`Unsupported data source type: ${kpi.dataSourceType}`);
    }

    // Create measurement
    const measurement = this.kpiMeasurementRepository.create({
      kpiDefinitionId: kpi.id,
      measurementDate: new Date(),
      measurementTimestamp: new Date(),
      value,
      targetValue: kpi.targetValue,
      targetPercentage: kpi.targetValue
        ? (value / parseFloat(kpi.targetValue.toString())) * 100
        : null,
      triggeredAlert: false,
      rawData,
    });

    // Check thresholds and trigger alerts
    if (kpi.minThreshold && value < parseFloat(kpi.minThreshold.toString())) {
      measurement.triggeredAlert = true;
      measurement.alertDetails = {
        type: 'MIN_THRESHOLD',
        threshold: kpi.minThreshold,
        value,
        message: `KPI ${kpi.kpiName} is below minimum threshold`,
      };
    }

    if (kpi.maxThreshold && value > parseFloat(kpi.maxThreshold.toString())) {
      measurement.triggeredAlert = true;
      measurement.alertDetails = {
        type: 'MAX_THRESHOLD',
        threshold: kpi.maxThreshold,
        value,
        message: `KPI ${kpi.kpiName} is above maximum threshold`,
      };
    }

    const saved = await this.kpiMeasurementRepository.save(measurement);

    // Update KPI definition
    kpi.lastCalculatedAt = new Date();
    if (kpi.calculationFrequency !== KPIFrequency.REAL_TIME) {
      kpi.nextCalculationAt = this.calculateNextCalculationDate(kpi.calculationFrequency);
    }
    await this.kpiDefinitionRepository.save(kpi);

    this.logger.log(`Calculated KPI ${kpiDefinitionId}: ${value}`);

    return saved;
  }

  /**
   * Calculate KPI from database query
   */
  private async calculateFromDatabase(kpi: KPIDefinition): Promise<number> {
    if (!kpi.dataSourceConfig || !kpi.dataSourceConfig.query) {
      throw new BadRequestException('Database KPI missing query configuration');
    }

    try {
      const query = kpi.dataSourceConfig.query;
      const params = kpi.dataSourceConfig.params || [];

      const result = await this.dataSource.query(query, params);

      if (!result || result.length === 0) {
        return 0;
      }

      const row = result[0];
      const value = parseFloat(row[kpi.dataSourceConfig.valueColumn || 'value'] || 0);

      // Apply calculation type
      return this.applyCalculationType(result, kpi.calculationType, kpi.dataSourceConfig.valueColumn);
    } catch (error) {
      this.logger.error(`Error calculating KPI from database: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to calculate KPI from database: ${error.message}`);
    }
  }

  /**
   * Calculate KPI from formula
   */
  private async calculateFromFormula(kpi: KPIDefinition): Promise<number> {
    if (!kpi.calculationFormula) {
      throw new BadRequestException('Formula KPI missing calculation formula');
    }

    // Simple formula evaluation (for production, use a proper expression evaluator)
    // This is a basic implementation - in production, use a library like mathjs
    try {
      // Replace variables with actual values (simplified - would need proper parsing)
      const formula = kpi.calculationFormula;
      // For now, return 0 - would need proper formula parser
      this.logger.warn('Formula calculation not fully implemented');
      return 0;
    } catch (error) {
      this.logger.error(`Error calculating KPI from formula: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to calculate KPI from formula: ${error.message}`);
    }
  }

  /**
   * Calculate KPI from goal
   */
  private async calculateFromGoal(kpi: KPIDefinition): Promise<number> {
    if (!kpi.goalId) {
      throw new BadRequestException('Goal KPI missing goal ID');
    }

    // Query goal progress
    const goalResult = await this.dataSource.query(
      `SELECT progress_percentage FROM goals WHERE id = $1`,
      [kpi.goalId],
    );

    if (!goalResult || goalResult.length === 0) {
      throw new NotFoundException(`Goal ${kpi.goalId} not found`);
    }

    return parseFloat(goalResult[0].progress_percentage || 0);
  }

  /**
   * Apply calculation type to result set
   */
  private applyCalculationType(
    results: any[],
    calculationType: KPICalculationType,
    valueColumn: string = 'value',
  ): number {
    if (!results || results.length === 0) {
      return 0;
    }

    const values = results.map((row) => parseFloat(row[valueColumn] || 0));

    switch (calculationType) {
      case KPICalculationType.SUM:
        return values.reduce((sum, val) => sum + val, 0);
      case KPICalculationType.AVERAGE:
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case KPICalculationType.COUNT:
        return values.length;
      case KPICalculationType.MIN:
        return Math.min(...values);
      case KPICalculationType.MAX:
        return Math.max(...values);
      default:
        return values[0] || 0;
    }
  }

  /**
   * Calculate next calculation date
   */
  private calculateNextCalculationDate(frequency: KPIFrequency): Date {
    const nextDate = new Date();

    switch (frequency) {
      case KPIFrequency.HOURLY:
        nextDate.setHours(nextDate.getHours() + 1);
        break;
      case KPIFrequency.DAILY:
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case KPIFrequency.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case KPIFrequency.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case KPIFrequency.QUARTERLY:
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case KPIFrequency.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
  }

  /**
   * Calculate all KPIs needing calculation
   */
  async calculateAllPendingKPIs(organizationId?: number): Promise<KPIMeasurement[]> {
    const kpis = await this.kpiDefinitionRepository.findNeedingCalculation(organizationId);
    const measurements: KPIMeasurement[] = [];

    for (const kpi of kpis) {
      try {
        const measurement = await this.calculateKPI(kpi.id);
        measurements.push(measurement);
      } catch (error) {
        this.logger.error(`Failed to calculate KPI ${kpi.id}: ${error.message}`, error.stack);
      }
    }

    return measurements;
  }

  /**
   * Get forecasted values (simple linear regression)
   */
  async getForecast(
    kpiDefinitionId: number,
    periods: number,
    periodType: 'day' | 'week' | 'month' = 'day',
  ): Promise<Array<{ date: Date; forecastedValue: number }>> {
    // Get recent measurements
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    const measurements = await this.kpiMeasurementRepository.findByKPI(
      kpiDefinitionId,
      startDate,
      endDate,
    );

    if (measurements.length < 2) {
      return [];
    }

    // Simple linear regression
    const values = measurements.map((m) => parseFloat(m.value.toString()));
    const dates = measurements.map((m) => m.measurementDate.getTime());

    const n = values.length;
    const sumX = dates.reduce((sum, d) => sum + d, 0);
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = dates.reduce((sum, d, i) => sum + d * values[i], 0);
    const sumX2 = dates.reduce((sum, d) => sum + d * d, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecast
    const forecast: Array<{ date: Date; forecastedValue: number }> = [];
    const lastDate = measurements[measurements.length - 1].measurementDate;
    const periodMs = this.getPeriodMs(periodType);

    for (let i = 1; i <= periods; i++) {
      const forecastDate = new Date(lastDate.getTime() + periodMs * i);
      const forecastedValue = slope * forecastDate.getTime() + intercept;
      forecast.push({
        date: forecastDate,
        forecastedValue: Math.max(0, forecastedValue), // Ensure non-negative
      });
    }

    return forecast;
  }

  /**
   * Get period in milliseconds
   */
  private getPeriodMs(periodType: 'day' | 'week' | 'month'): number {
    switch (periodType) {
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000; // Approximate
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Aggregate measurements by period
   */
  async aggregateByPeriod(
    kpiDefinitionId: number,
    startDate: Date,
    endDate: Date,
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
  ): Promise<Array<{ period: string; value: number; count: number }>> {
    return this.kpiMeasurementRepository.aggregateByPeriod(
      kpiDefinitionId,
      startDate,
      endDate,
      period,
    );
  }
}
