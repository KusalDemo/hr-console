import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DashboardWidgetRepository } from '../repositories/dashboard-widget.repository';
import {
  DashboardWidget,
  WidgetType,
  WidgetDataSourceType,
} from '../entities/dashboard-widget.entity';
import { KPIDefinitionRepository } from '../../kpis/repositories/kpi-definition.repository';
import { KPIMeasurementRepository } from '../../kpis/repositories/kpi-measurement.repository';

/**
 * Widget Data Service
 *
 * Provides widget data aggregation for:
 * - KPI-based widgets
 * - Database query widgets
 * - API-based widgets
 * - Calculated widgets
 * - Static widgets
 */
@Injectable()
export class WidgetDataService {
  private readonly logger = new Logger(WidgetDataService.name);

  constructor(
    private readonly dashboardWidgetRepository: DashboardWidgetRepository,
    private readonly kpiDefinitionRepository: KPIDefinitionRepository,
    private readonly kpiMeasurementRepository: KPIMeasurementRepository,
  ) {}

  /**
   * Get widget data
   */
  async getWidgetData(widgetId: number, filters?: Record<string, any>): Promise<any> {
    const widget = await this.dashboardWidgetRepository.findById(widgetId);

    if (!widget) {
      throw new NotFoundException(`Widget with ID ${widgetId} not found`);
    }

    if (!widget.isActive || !widget.isVisible) {
      return { data: null, message: 'Widget is not active or visible' };
    }

    // Merge widget filters with provided filters
    const mergedFilters = {
      ...(widget.widgetFilters || {}),
      ...(filters || {}),
    };

    switch (widget.dataSourceType) {
      case WidgetDataSourceType.KPI:
        return this.getKPIData(widget, mergedFilters);

      case WidgetDataSourceType.DATABASE:
        return this.getDatabaseData(widget, mergedFilters);

      case WidgetDataSourceType.API:
        return this.getAPIData(widget, mergedFilters);

      case WidgetDataSourceType.STATIC:
        return this.getStaticData(widget);

      case WidgetDataSourceType.CALCULATED:
        return this.getCalculatedData(widget, mergedFilters);

      default:
        return { data: null, message: 'Unknown data source type' };
    }
  }

  /**
   * Get KPI data for widget
   */
  private async getKPIData(widget: DashboardWidget, filters: Record<string, any>): Promise<any> {
    if (!widget.kpiDefinitionId) {
      return { data: null, message: 'KPI definition ID not set' };
    }

    const kpiDefinition = await this.kpiDefinitionRepository.findById(widget.kpiDefinitionId);

    if (!kpiDefinition) {
      return { data: null, message: 'KPI definition not found' };
    }

    // Get latest measurement or calculate based on filters
    const dateFrom = filters.dateFrom
      ? new Date(filters.dateFrom)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : new Date();

    const measurements = await this.kpiMeasurementRepository.findByKPI(
      widget.kpiDefinitionId,
      dateFrom,
      dateTo,
    );

    // Format data based on widget type
    if (widget.widgetType === WidgetType.KPI || widget.widgetType === WidgetType.METRIC) {
      // Single value widget
      const latest = measurements.length > 0 ? measurements[measurements.length - 1] : null;
      return {
        value: latest ? parseFloat(latest.value.toString()) : 0,
        unit: kpiDefinition.unit || '',
        target: kpiDefinition.targetValue ? parseFloat(kpiDefinition.targetValue.toString()) : null,
        minThreshold: kpiDefinition.minThreshold
          ? parseFloat(kpiDefinition.minThreshold.toString())
          : null,
        maxThreshold: kpiDefinition.maxThreshold
          ? parseFloat(kpiDefinition.maxThreshold.toString())
          : null,
        trend: this.calculateTrend(measurements),
      };
    } else if (widget.widgetType === WidgetType.CHART) {
      // Chart widget
      return {
        labels: measurements.map((m) => m.measurementDate.toISOString().split('T')[0]),
        datasets: [
          {
            label: kpiDefinition.kpiName,
            data: measurements.map((m) => parseFloat(m.value.toString())),
          },
        ],
        unit: kpiDefinition.unit || '',
      };
    } else if (widget.widgetType === WidgetType.TABLE) {
      // Table widget
      return {
        columns: ['Date', 'Value', 'Unit'],
        rows: measurements.map((m) => ({
          date: m.measurementDate.toISOString().split('T')[0],
          value: parseFloat(m.value.toString()),
          unit: kpiDefinition.unit || '',
        })),
      };
    }

    return { data: measurements, message: 'Data retrieved' };
  }

  /**
   * Get database data for widget
   */
  private async getDatabaseData(
    widget: DashboardWidget,
    filters: Record<string, any>,
  ): Promise<any> {
    const config = widget.dataSourceConfig || {};

    // This would typically execute a raw SQL query or use TypeORM query builder
    // For now, return a placeholder structure
    this.logger.warn(`Database data source not fully implemented for widget ${widget.id}`);

    return {
      data: null,
      message: 'Database data source requires query configuration',
    };
  }

  /**
   * Get API data for widget
   */
  private async getAPIData(widget: DashboardWidget, filters: Record<string, any>): Promise<any> {
    const config = widget.dataSourceConfig || {};

    // This would typically make an HTTP request to an external API
    // For now, return a placeholder structure
    this.logger.warn(`API data source not fully implemented for widget ${widget.id}`);

    return {
      data: null,
      message: 'API data source requires endpoint configuration',
    };
  }

  /**
   * Get static data for widget
   */
  private async getStaticData(widget: DashboardWidget): Promise<any> {
    const config = widget.dataSourceConfig || {};

    return {
      data: config.data || null,
      message: 'Static data',
    };
  }

  /**
   * Get calculated data for widget
   */
  private async getCalculatedData(
    widget: DashboardWidget,
    filters: Record<string, any>,
  ): Promise<any> {
    const config = widget.dataSourceConfig || {};

    // This would typically calculate from other widgets or data sources
    // For now, return a placeholder structure
    this.logger.warn(`Calculated data source not fully implemented for widget ${widget.id}`);

    return {
      data: null,
      message: 'Calculated data source requires calculation formula',
    };
  }

  /**
   * Calculate trend from measurements
   */
  private calculateTrend(measurements: any[]): 'up' | 'down' | 'stable' {
    if (measurements.length < 2) {
      return 'stable';
    }

    const sorted = [...measurements].sort(
      (a, b) => a.measurementDate.getTime() - b.measurementDate.getTime(),
    );
    const first = parseFloat(sorted[0].value.toString());
    const last = parseFloat(sorted[sorted.length - 1].value.toString());

    const diff = last - first;
    const threshold = Math.abs(first * 0.05); // 5% threshold

    if (diff > threshold) {
      return 'up';
    } else if (diff < -threshold) {
      return 'down';
    } else {
      return 'stable';
    }
  }

  /**
   * Get multiple widgets data
   */
  async getMultipleWidgetsData(
    widgetIds: number[],
    filters?: Record<string, any>,
  ): Promise<Record<number, any>> {
    const results: Record<number, any> = {};

    for (const widgetId of widgetIds) {
      try {
        results[widgetId] = await this.getWidgetData(widgetId, filters);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error getting data for widget ${widgetId}: ${errorMessage}`);
        results[widgetId] = { data: null, error: errorMessage };
      }
    }

    return results;
  }

  /**
   * Get dashboard widgets data
   */
  async getDashboardWidgetsData(
    dashboardId: number,
    filters?: Record<string, any>,
  ): Promise<Record<number, any>> {
    const widgets = await this.dashboardWidgetRepository.findVisibleWidgetsByDashboard(dashboardId);

    const widgetIds = widgets.map((w) => w.id);
    return this.getMultipleWidgetsData(widgetIds, filters);
  }
}
