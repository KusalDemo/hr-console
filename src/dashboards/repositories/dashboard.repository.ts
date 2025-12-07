import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Dashboard, DashboardType } from '../entities/dashboard.entity';

/**
 * Dashboard Repository
 *
 * Custom repository methods for dashboard queries.
 */
@Injectable()
export class DashboardRepository extends Repository<Dashboard> {
  constructor(private dataSource: DataSource) {
    super(Dashboard, dataSource.createEntityManager());
  }

  /**
   * Find dashboard by ID
   */
  async findById(id: number, includeWidgets = false): Promise<Dashboard | null> {
    const query = this.createQueryBuilder('dashboard').where('dashboard.id = :id', { id });

    if (includeWidgets) {
      query.leftJoinAndSelect('dashboard.widgets', 'widgets').orderBy('widgets.widgetOrder', 'ASC');
    }

    return query.getOne();
  }

  /**
   * Find dashboards by organization
   */
  async findByOrganization(organizationId: number, includeInactive = false): Promise<Dashboard[]> {
    const query = this.createQueryBuilder('dashboard')
      .where('dashboard.organizationId = :organizationId', { organizationId })
      .orderBy('dashboard.dashboardName', 'ASC');

    if (!includeInactive) {
      query.andWhere('dashboard.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  /**
   * Find dashboards by type
   */
  async findByType(
    dashboardType: DashboardType,
    organizationId?: number,
    ownerId?: number,
  ): Promise<Dashboard[]> {
    const query = this.createQueryBuilder('dashboard')
      .where('dashboard.dashboardType = :dashboardType', { dashboardType })
      .andWhere('dashboard.isActive = :isActive', { isActive: true })
      .orderBy('dashboard.dashboardName', 'ASC');

    if (organizationId) {
      query.andWhere('dashboard.organizationId = :organizationId', { organizationId });
    }

    if (ownerId) {
      query.andWhere('dashboard.ownerId = :ownerId', { ownerId });
    }

    return query.getMany();
  }

  /**
   * Find personal dashboards for user
   */
  async findPersonalDashboards(ownerId: number, organizationId: number): Promise<Dashboard[]> {
    return this.createQueryBuilder('dashboard')
      .where('dashboard.ownerId = :ownerId', { ownerId })
      .andWhere('dashboard.organizationId = :organizationId', { organizationId })
      .andWhere('dashboard.dashboardType = :dashboardType', {
        dashboardType: DashboardType.PERSONAL,
      })
      .andWhere('dashboard.isActive = :isActive', { isActive: true })
      .orderBy('dashboard.dashboardName', 'ASC')
      .getMany();
  }

  /**
   * Find shared dashboards
   */
  async findSharedDashboards(
    organizationId: number,
    includeInactive = false,
  ): Promise<Dashboard[]> {
    const query = this.createQueryBuilder('dashboard')
      .where('dashboard.isShared = :isShared', { isShared: true })
      .andWhere('dashboard.organizationId = :organizationId', { organizationId })
      .orderBy('dashboard.dashboardName', 'ASC');

    if (!includeInactive) {
      query.andWhere('dashboard.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  /**
   * Find dashboard templates
   */
  async findTemplates(organizationId?: number): Promise<Dashboard[]> {
    const query = this.createQueryBuilder('dashboard')
      .where('dashboard.isTemplate = :isTemplate', { isTemplate: true })
      .andWhere('dashboard.isActive = :isActive', { isActive: true })
      .orderBy('dashboard.dashboardName', 'ASC');

    if (organizationId) {
      query.andWhere('dashboard.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find dashboards by category
   */
  async findByCategory(category: string, organizationId?: number): Promise<Dashboard[]> {
    const query = this.createQueryBuilder('dashboard')
      .where('dashboard.category = :category', { category })
      .andWhere('dashboard.isActive = :isActive', { isActive: true })
      .orderBy('dashboard.dashboardName', 'ASC');

    if (organizationId) {
      query.andWhere('dashboard.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
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
    const query = this.createQueryBuilder('dashboard').orderBy('dashboard.dashboardName', 'ASC');

    if (searchTerm) {
      query.andWhere(
        `(
          dashboard.dashboardName ILIKE :searchTerm OR
          dashboard.dashboardDescription ILIKE :searchTerm
        )`,
        { searchTerm: `%${searchTerm}%` },
      );
    }

    if (dashboardType) {
      query.andWhere('dashboard.dashboardType = :dashboardType', { dashboardType });
    }

    if (category) {
      query.andWhere('dashboard.category = :category', { category });
    }

    if (organizationId) {
      query.andWhere('dashboard.organizationId = :organizationId', { organizationId });
    }

    if (!includeInactive) {
      query.andWhere('dashboard.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  /**
   * Find dashboards accessible to user
   */
  async findAccessibleDashboards(
    userId: number,
    organizationId: number,
    departmentId?: number,
    teamId?: number,
  ): Promise<Dashboard[]> {
    const query = this.createQueryBuilder('dashboard')
      .where('dashboard.organizationId = :organizationId', { organizationId })
      .andWhere('dashboard.isActive = :isActive', { isActive: true })
      .andWhere(
        `(
          dashboard.dashboardType = :personalType AND dashboard.ownerId = :userId OR
          dashboard.dashboardType = :orgType OR
          dashboard.isShared = :isShared OR
          (dashboard.dashboardType = :deptType AND dashboard.departmentId = :departmentId) OR
          (dashboard.dashboardType = :teamType AND dashboard.teamId = :teamId)
        )`,
        {
          userId,
          personalType: DashboardType.PERSONAL,
          orgType: DashboardType.ORGANIZATION,
          isShared: true,
          deptType: DashboardType.DEPARTMENT,
          departmentId: departmentId || 0,
          teamType: DashboardType.TEAM,
          teamId: teamId || 0,
        },
      )
      .orderBy('dashboard.dashboardName', 'ASC');

    return query.getMany();
  }
}
