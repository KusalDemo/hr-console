import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { Dashboard } from './dashboard.entity';

/**
 * Widget Type Enum
 */
export enum WidgetType {
  CHART = 'CHART', // Chart widget (line, bar, pie, etc.)
  TABLE = 'TABLE', // Table widget
  KPI = 'KPI', // KPI widget (single metric)
  LIST = 'LIST', // List widget
  METRIC = 'METRIC', // Metric widget
  TEXT = 'TEXT', // Text widget
  IMAGE = 'IMAGE', // Image widget
  CUSTOM = 'CUSTOM', // Custom widget
}

/**
 * Chart Type Enum
 */
export enum ChartType {
  LINE = 'LINE', // Line chart
  BAR = 'BAR', // Bar chart
  PIE = 'PIE', // Pie chart
  AREA = 'AREA', // Area chart
  SCATTER = 'SCATTER', // Scatter chart
  DONUT = 'DONUT', // Donut chart
  GAUGE = 'GAUGE', // Gauge chart
}

/**
 * Widget Data Source Type Enum
 */
export enum WidgetDataSourceType {
  KPI = 'KPI', // From KPI definition
  DATABASE = 'DATABASE', // Database query
  API = 'API', // External API
  STATIC = 'STATIC', // Static data
  CALCULATED = 'CALCULATED', // Calculated from other widgets
}

/**
 * Dashboard Widget Entity
 * 
 * Reusable widget definitions for dashboards:
 * - Widget types (charts, tables, KPIs, lists)
 * - Data source configuration
 * - Widget position and size
 * - Widget settings and filters
 */
@Entity('dashboard_widgets')
@Index('idx_dashboard_widgets_dashboard', ['dashboardId'])
@Index('idx_dashboard_widgets_type', ['widgetType'])
@Index('idx_dashboard_widgets_kpi', ['kpiDefinitionId'])
@Index('idx_dashboard_widgets_active', ['isActive'])
export class DashboardWidget {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Dashboard this widget belongs to
   */
  @ManyToOne(() => Dashboard, (dashboard) => dashboard.widgets, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dashboard_id' })
  dashboard: Dashboard;

  @Column({ name: 'dashboard_id', type: 'bigint', nullable: false })
  dashboardId: number;

  /**
   * Widget name
   */
  @Column({ name: 'widget_name', type: 'varchar', length: 255, nullable: false })
  widgetName: string;

  /**
   * Widget description
   */
  @Column({ name: 'widget_description', type: 'text', nullable: true })
  widgetDescription: string | null;

  /**
   * Widget type
   */
  @Column({
    name: 'widget_type',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  widgetType: WidgetType;

  /**
   * Chart type (if widget type is CHART)
   */
  @Column({
    name: 'chart_type',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  chartType: ChartType | null;

  /**
   * Data source type
   */
  @Column({
    name: 'data_source_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: WidgetDataSourceType.DATABASE,
  })
  dataSourceType: WidgetDataSourceType;

  /**
   * KPI definition ID (if data source is KPI)
   */
  @Column({ name: 'kpi_definition_id', type: 'bigint', nullable: true })
  kpiDefinitionId: number | null;

  /**
   * Data source configuration (JSON: query, API endpoint, filters, etc.)
   */
  @Column({ name: 'data_source_config', type: 'jsonb', nullable: true })
  dataSourceConfig: Record<string, any> | null;

  /**
   * Widget position (JSON: x, y, width, height, row, col)
   */
  @Column({ name: 'position', type: 'jsonb', nullable: true })
  position: Record<string, any> | null;

  /**
   * Widget size (JSON: width, height, minWidth, minHeight, maxWidth, maxHeight)
   */
  @Column({ name: 'size', type: 'jsonb', nullable: true })
  size: Record<string, any> | null;

  /**
   * Widget settings (JSON: colors, labels, formatting, etc.)
   */
  @Column({ name: 'widget_settings', type: 'jsonb', nullable: true })
  widgetSettings: Record<string, any> | null;

  /**
   * Widget filters (JSON: date range, filters, etc.)
   */
  @Column({ name: 'widget_filters', type: 'jsonb', nullable: true })
  widgetFilters: Record<string, any> | null;

  /**
   * Refresh interval in seconds (0 = no auto-refresh)
   */
  @Column({ name: 'refresh_interval', type: 'integer', nullable: false, default: 0 })
  refreshInterval: number;

  /**
   * Widget order/sequence
   */
  @Column({ name: 'widget_order', type: 'integer', nullable: false, default: 0 })
  widgetOrder: number;

  /**
   * Whether widget is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Whether widget is visible
   */
  @Column({ name: 'is_visible', type: 'boolean', nullable: false, default: true })
  isVisible: boolean;

  /**
   * Widget metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'widget_metadata', type: 'jsonb', nullable: true })
  widgetMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
