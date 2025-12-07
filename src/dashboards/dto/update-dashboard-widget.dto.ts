import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { WidgetType, ChartType, WidgetDataSourceType } from '../entities/dashboard-widget.entity';

/**
 * Update Dashboard Widget DTO
 */
export class UpdateDashboardWidgetDto {
  @IsOptional()
  @IsString()
  widgetName?: string;

  @IsOptional()
  @IsString()
  widgetDescription?: string;

  @IsOptional()
  @IsEnum(WidgetType)
  widgetType?: WidgetType;

  @IsOptional()
  @IsEnum(ChartType)
  chartType?: ChartType;

  @IsOptional()
  @IsEnum(WidgetDataSourceType)
  dataSourceType?: WidgetDataSourceType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  kpiDefinitionId?: number;

  @IsOptional()
  @IsObject()
  dataSourceConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  position?: Record<string, any>;

  @IsOptional()
  @IsObject()
  size?: Record<string, any>;

  @IsOptional()
  @IsObject()
  widgetSettings?: Record<string, any>;

  @IsOptional()
  @IsObject()
  widgetFilters?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  refreshInterval?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  widgetOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsObject()
  widgetMetadata?: Record<string, any>;
}
