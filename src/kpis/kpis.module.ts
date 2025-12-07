import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KPIsController } from './kpis.controller';
import { KPIService, KPICalculationService } from './services';
import {
  KPIDefinitionRepository,
  KPIMeasurementRepository,
} from './repositories';
import { KPIDefinition, KPIMeasurement } from './entities';

/**
 * KPIs Module
 * 
 * Provides configurable KPIs and metric definitions with:
 * - KPI definition management
 * - Calculation formulas and data sources
 * - Time-series measurement tracking
 * - KPI dashboards, alerts, thresholds
 * - Metric aggregation, forecasting, trend analysis
 * - Integration with goals for automated KPI updates
 * - Scheduled KPI calculation jobs
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([KPIDefinition, KPIMeasurement]),
  ],
  controllers: [KPIsController],
  providers: [
    KPIService,
    KPICalculationService,
    KPIDefinitionRepository,
    KPIMeasurementRepository,
  ],
  exports: [
    KPIService,
    KPICalculationService,
    KPIDefinitionRepository,
    KPIMeasurementRepository,
  ],
})
export class KPIsModule {}
