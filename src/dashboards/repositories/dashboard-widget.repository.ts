import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DashboardWidget, WidgetType } from '../entities/dashboard-widget.entity';

/**
 * Dashboard Widget Repository
 * 
 * Custom repository methods for dashboard widget queries.
 */
@Injectable()
export class DashboardWidgetRepository extends Repository<DashboardWidget> {
  constructor(private dataSource: DataSource) {
    super(DashboardWidget, dataSource.createEntityManager());
  }

  /**
   * Find widget by ID
   */
  async findById(id: number): Promise<DashboardWidget | null> {
    return this.createQueryBuilder('widget')
      .where('widget.id = :id', { id })
      .getOne();
  }

  /**
   * Find widgets by dashboard
   */
  async findByDashboard(
    dashboardId: number,
    includeInactive = false,
  ): Promise<DashboardWidget[]> {
    const query = this.createQueryBuilder('widget')
      .where('widget.dashboardId = :dashboardId', { dashboardId })
      .orderBy('widget.widgetOrder', 'ASC')
      .addOrderBy('widget.id', 'ASC');

    if (!includeInactive) {
      query.andWhere('widget.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  /**
   * Find visible widgets by dashboard
   */
  async findVisibleWidgetsByDashboard(
    dashboardId: number,
  ): Promise<DashboardWidget[]> {
    return this.createQueryBuilder('widget')
      .where('widget.dashboardId = :dashboardId', { dashboardId })
      .andWhere('widget.isActive = :isActive', { isActive: true })
      .andWhere('widget.isVisible = :isVisible', { isVisible: true })
      .orderBy('widget.widgetOrder', 'ASC')
      .addOrderBy('widget.id', 'ASC')
      .getMany();
  }

  /**
   * Find widgets by type
   */
  async findByType(
    widgetType: WidgetType,
    dashboardId?: number,
  ): Promise<DashboardWidget[]> {
    const query = this.createQueryBuilder('widget')
      .where('widget.widgetType = :widgetType', { widgetType })
      .andWhere('widget.isActive = :isActive', { isActive: true })
      .orderBy('widget.widgetOrder', 'ASC');

    if (dashboardId) {
      query.andWhere('widget.dashboardId = :dashboardId', { dashboardId });
    }

    return query.getMany();
  }

  /**
   * Find widgets by KPI definition
   */
  async findByKPIDefinition(
    kpiDefinitionId: number,
  ): Promise<DashboardWidget[]> {
    return this.createQueryBuilder('widget')
      .where('widget.kpiDefinitionId = :kpiDefinitionId', { kpiDefinitionId })
      .andWhere('widget.isActive = :isActive', { isActive: true })
      .orderBy('widget.widgetOrder', 'ASC')
      .getMany();
  }

  /**
   * Update widget order
   */
  async updateWidgetOrder(
    dashboardId: number,
    widgetOrders: Array<{ id: number; order: number }>,
  ): Promise<void> {
    for (const { id, order } of widgetOrders) {
      await this.update(id, { widgetOrder: order });
    }
  }
}
