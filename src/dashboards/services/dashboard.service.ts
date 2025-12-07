import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { DashboardWidgetRepository } from '../repositories/dashboard-widget.repository';
import { Dashboard, DashboardType, DashboardLayoutType } from '../entities/dashboard.entity';
import { DashboardWidget } from '../entities/dashboard-widget.entity';

/**
 * Dashboard Service
 *
 * Manages dashboards with:
 * - Dashboard CRUD operations
 * - Dashboard templates and cloning
 * - Dashboard sharing
 * - Widget management
 * - Layout configuration
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly dashboardWidgetRepository: DashboardWidgetRepository,
  ) {}

  /**
   * Create a new dashboard
   */
  async createDashboard(createDto: any, createdBy?: number): Promise<Dashboard> {
    const dashboard = this.dashboardRepository.create({
      ...createDto,
      dashboardType: createDto.dashboardType || DashboardType.PERSONAL,
      layoutType: createDto.layoutType || DashboardLayoutType.GRID,
      isShared: createDto.isShared || false,
      isTemplate: createDto.isTemplate || false,
      isActive: true,
      createdBy,
    });

    const saved = await this.dashboardRepository.save(dashboard);
    const savedEntity = Array.isArray(saved) ? saved[0] : saved;

    this.logger.log(`Created dashboard: ${savedEntity.id} (${savedEntity.dashboardName})`);

    return savedEntity;
  }

  /**
   * Get dashboard by ID
   */
  async getDashboardById(id: number, includeWidgets = false): Promise<Dashboard> {
    const dashboard = await this.dashboardRepository.findById(id, includeWidgets);

    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID ${id} not found`);
    }

    return dashboard;
  }

  /**
   * Update dashboard
   */
  async updateDashboard(id: number, updateDto: any, updatedBy?: number): Promise<Dashboard> {
    const dashboard = await this.dashboardRepository.findById(id);

    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID ${id} not found`);
    }

    Object.assign(dashboard, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.dashboardRepository.save(dashboard);

    this.logger.log(`Updated dashboard: ${saved.id} (${saved.dashboardName})`);

    return saved;
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(id: number): Promise<void> {
    const dashboard = await this.dashboardRepository.findById(id);

    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID ${id} not found`);
    }

    await this.dashboardRepository.remove(dashboard);

    this.logger.log(`Deleted dashboard: ${id}`);
  }

  /**
   * Clone dashboard from template or existing dashboard
   */
  async cloneDashboard(
    sourceDashboardId: number,
    newDashboardName: string,
    organizationId: number,
    ownerId?: number,
    createdBy?: number,
  ): Promise<Dashboard> {
    const sourceDashboard = await this.dashboardRepository.findById(
      sourceDashboardId,
      true, // Include widgets
    );

    if (!sourceDashboard) {
      throw new NotFoundException(`Source dashboard with ID ${sourceDashboardId} not found`);
    }

    // Create new dashboard
    const newDashboard = this.dashboardRepository.create({
      dashboardName: newDashboardName,
      dashboardDescription: sourceDashboard.dashboardDescription,
      organizationId,
      dashboardType: ownerId ? DashboardType.PERSONAL : sourceDashboard.dashboardType,
      ownerId,
      departmentId: sourceDashboard.departmentId,
      teamId: sourceDashboard.teamId,
      layoutType: sourceDashboard.layoutType,
      layoutConfig: sourceDashboard.layoutConfig
        ? JSON.parse(JSON.stringify(sourceDashboard.layoutConfig))
        : null,
      widgetConfigs: sourceDashboard.widgetConfigs
        ? JSON.parse(JSON.stringify(sourceDashboard.widgetConfigs))
        : null,
      isShared: false,
      isTemplate: false,
      templateId: sourceDashboard.isTemplate ? sourceDashboard.id : sourceDashboard.templateId,
      isActive: true,
      category: sourceDashboard.category,
      tags: sourceDashboard.tags ? [...sourceDashboard.tags] : null,
      createdBy,
    });

    const saved = await this.dashboardRepository.save(newDashboard);

    // Clone widgets
    const widgets = await sourceDashboard.widgets;
    if (Array.isArray(widgets) && widgets.length > 0) {
      const newWidgets = widgets.map((widget) =>
        this.dashboardWidgetRepository.create({
          dashboardId: saved.id,
          widgetName: widget.widgetName,
          widgetDescription: widget.widgetDescription,
          widgetType: widget.widgetType,
          chartType: widget.chartType,
          dataSourceType: widget.dataSourceType,
          kpiDefinitionId: widget.kpiDefinitionId,
          dataSourceConfig: widget.dataSourceConfig
            ? JSON.parse(JSON.stringify(widget.dataSourceConfig))
            : null,
          position: widget.position ? JSON.parse(JSON.stringify(widget.position)) : null,
          size: widget.size ? JSON.parse(JSON.stringify(widget.size)) : null,
          widgetSettings: widget.widgetSettings
            ? JSON.parse(JSON.stringify(widget.widgetSettings))
            : null,
          widgetFilters: widget.widgetFilters
            ? JSON.parse(JSON.stringify(widget.widgetFilters))
            : null,
          refreshInterval: widget.refreshInterval,
          widgetOrder: widget.widgetOrder,
          isActive: widget.isActive,
          isVisible: widget.isVisible,
          createdBy,
        }),
      );

      await this.dashboardWidgetRepository.save(newWidgets);
    }

    this.logger.log(
      `Cloned dashboard: ${sourceDashboardId} -> ${saved.id} (${saved.dashboardName})`,
    );

    return saved;
  }

  /**
   * Get dashboards by organization
   */
  async getDashboardsByOrganization(
    organizationId: number,
    includeInactive = false,
  ): Promise<Dashboard[]> {
    return this.dashboardRepository.findByOrganization(organizationId, includeInactive);
  }

  /**
   * Get personal dashboards for user
   */
  async getPersonalDashboards(ownerId: number, organizationId: number): Promise<Dashboard[]> {
    return this.dashboardRepository.findPersonalDashboards(ownerId, organizationId);
  }

  /**
   * Get shared dashboards
   */
  async getSharedDashboards(organizationId: number, includeInactive = false): Promise<Dashboard[]> {
    return this.dashboardRepository.findSharedDashboards(organizationId, includeInactive);
  }

  /**
   * Get dashboard templates
   */
  async getTemplates(organizationId?: number): Promise<Dashboard[]> {
    return this.dashboardRepository.findTemplates(organizationId);
  }

  /**
   * Get accessible dashboards for user
   */
  async getAccessibleDashboards(
    userId: number,
    organizationId: number,
    departmentId?: number,
    teamId?: number,
  ): Promise<Dashboard[]> {
    return this.dashboardRepository.findAccessibleDashboards(
      userId,
      organizationId,
      departmentId,
      teamId,
    );
  }

  /**
   * Search dashboards
   */
  async searchDashboards(
    searchTerm?: string,
    dashboardType?: DashboardType,
    category?: string,
    organizationId?: number,
    includeInactive = false,
  ): Promise<Dashboard[]> {
    return this.dashboardRepository.searchDashboards(
      searchTerm,
      dashboardType,
      category,
      organizationId,
      includeInactive,
    );
  }

  /**
   * Add widget to dashboard
   */
  async addWidgetToDashboard(
    dashboardId: number,
    widgetData: any,
    createdBy?: number,
  ): Promise<DashboardWidget> {
    const dashboard = await this.dashboardRepository.findById(dashboardId);

    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID ${dashboardId} not found`);
    }

    // Get current max order
    const existingWidgets = await this.dashboardWidgetRepository.findByDashboard(dashboardId);
    const maxOrder =
      existingWidgets.length > 0 ? Math.max(...existingWidgets.map((w) => w.widgetOrder)) : -1;

    const widget = this.dashboardWidgetRepository.create({
      ...widgetData,
      dashboardId,
      widgetOrder: widgetData.widgetOrder ?? maxOrder + 1,
      isActive: true,
      isVisible: true,
      createdBy,
    });

    const saved = await this.dashboardWidgetRepository.save(widget);

    const savedEntity = Array.isArray(saved) ? saved[0] : saved;
    this.logger.log(`Added widget ${savedEntity.id} to dashboard ${dashboardId}`);

    return savedEntity;
  }

  /**
   * Update widget
   */
  async updateWidget(
    widgetId: number,
    updateDto: any,
    updatedBy?: number,
  ): Promise<DashboardWidget> {
    const widget = await this.dashboardWidgetRepository.findById(widgetId);

    if (!widget) {
      throw new NotFoundException(`Widget with ID ${widgetId} not found`);
    }

    Object.assign(widget, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.dashboardWidgetRepository.save(widget);

    this.logger.log(`Updated widget: ${saved.id}`);

    return saved;
  }

  /**
   * Delete widget
   */
  async deleteWidget(widgetId: number): Promise<void> {
    const widget = await this.dashboardWidgetRepository.findById(widgetId);

    if (!widget) {
      throw new NotFoundException(`Widget with ID ${widgetId} not found`);
    }

    await this.dashboardWidgetRepository.remove(widget);

    this.logger.log(`Deleted widget: ${widgetId}`);
  }

  /**
   * Update widget order
   */
  async updateWidgetOrder(
    dashboardId: number,
    widgetOrders: Array<{ id: number; order: number }>,
  ): Promise<void> {
    const dashboard = await this.dashboardRepository.findById(dashboardId);

    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID ${dashboardId} not found`);
    }

    await this.dashboardWidgetRepository.updateWidgetOrder(dashboardId, widgetOrders);

    this.logger.log(`Updated widget order for dashboard: ${dashboardId}`);
  }

  /**
   * Get dashboard widgets
   */
  async getDashboardWidgets(
    dashboardId: number,
    includeInactive = false,
  ): Promise<DashboardWidget[]> {
    const dashboard = await this.dashboardRepository.findById(dashboardId);

    if (!dashboard) {
      throw new NotFoundException(`Dashboard with ID ${dashboardId} not found`);
    }

    return this.dashboardWidgetRepository.findByDashboard(dashboardId, includeInactive);
  }
}
