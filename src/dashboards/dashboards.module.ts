import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardsController } from './dashboards.controller';
import { DashboardService, WidgetDataService } from './services';
import { DashboardRepository, DashboardWidgetRepository } from './repositories';
import { Dashboard, DashboardWidget } from './entities';
import { Organization } from '../organizations/entities/organization.entity';
import { KPIsModule } from '../kpis/kpis.module';

/**
 * Dashboards Module
 *
 * Provides configurable dashboards with widgets:
 * - Dashboard CRUD operations
 * - Dashboard templates and cloning
 * - Dashboard sharing (personal, team, department, organization)
 * - Widget management (charts, tables, KPIs, lists)
 * - Widget data aggregation
 * - Layout configuration (grid, flex, custom)
 * - Integration with KPI framework for widget data
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Dashboard, DashboardWidget, Organization]),
    KPIsModule, // For KPI data in widgets
  ],
  controllers: [DashboardsController],
  providers: [DashboardService, WidgetDataService, DashboardRepository, DashboardWidgetRepository],
  exports: [DashboardService, WidgetDataService, DashboardRepository, DashboardWidgetRepository],
})
export class DashboardsModule {}
