import { WidgetType, ChartType, WidgetDataSourceType } from '../entities/dashboard-widget.entity';

/**
 * Dashboard Widget Response DTO
 */
export class DashboardWidgetResponseDto {
  id: number;
  dashboardId: number;
  widgetName: string;
  widgetDescription: string | null;
  widgetType: WidgetType;
  chartType: ChartType | null;
  dataSourceType: WidgetDataSourceType;
  kpiDefinitionId: number | null;
  dataSourceConfig: Record<string, any> | null;
  position: Record<string, any> | null;
  size: Record<string, any> | null;
  widgetSettings: Record<string, any> | null;
  widgetFilters: Record<string, any> | null;
  refreshInterval: number;
  widgetOrder: number;
  isActive: boolean;
  isVisible: boolean;
  widgetMetadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;
}
