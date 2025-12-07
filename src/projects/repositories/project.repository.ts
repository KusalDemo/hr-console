import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Project, ProjectStatus, ProjectHealth } from '../entities/project.entity';

/**
 * Project Repository
 * 
 * Custom repository methods for project queries with optimized queries for project dashboards.
 */
@Injectable()
export class ProjectRepository extends Repository<Project> {
  constructor(private dataSource: DataSource) {
    super(Project, dataSource.createEntityManager());
  }

  /**
   * Find project by key
   */
  async findByKey(projectKey: string, includeRelations = false): Promise<Project | null> {
    const query = this.createQueryBuilder('project')
      .where('project.projectKey = :projectKey', { projectKey });

    if (includeRelations) {
      query
        .leftJoinAndSelect('project.organization', 'organization')
        .leftJoinAndSelect('project.parentProject', 'parentProject')
        .leftJoinAndSelect('project.phases', 'phases')
        .leftJoinAndSelect('project.teamMembers', 'teamMembers')
        .leftJoinAndSelect('teamMembers.employee', 'employee');
    }

    return query.getOne();
  }

  /**
   * Find project by ID
   */
  async findById(id: number, includeRelations = false): Promise<Project | null> {
    const query = this.createQueryBuilder('project').where('project.id = :id', { id });

    if (includeRelations) {
      query
        .leftJoinAndSelect('project.organization', 'organization')
        .leftJoinAndSelect('project.parentProject', 'parentProject')
        .leftJoinAndSelect('project.childProjects', 'childProjects')
        .leftJoinAndSelect('project.phases', 'phases')
        .leftJoinAndSelect('project.teamMembers', 'teamMembers')
        .leftJoinAndSelect('teamMembers.employee', 'employee');
    }

    return query.getOne();
  }

  /**
   * Find projects by organization
   */
  async findByOrganization(
    organizationId: number,
    includeArchived = false,
    includeRelations = false,
  ): Promise<Project[]> {
    const query = this.createQueryBuilder('project')
      .where('project.organizationId = :organizationId', { organizationId });

    if (!includeArchived) {
      query.andWhere('project.isArchived = :isArchived', { isArchived: false });
    }

    query.orderBy('project.createdAt', 'DESC');

    if (includeRelations) {
      query
        .leftJoinAndSelect('project.organization', 'organization')
        .leftJoinAndSelect('project.parentProject', 'parentProject')
        .leftJoinAndSelect('project.phases', 'phases')
        .leftJoinAndSelect('project.teamMembers', 'teamMembers')
        .leftJoinAndSelect('teamMembers.employee', 'employee');
    }

    return query.getMany();
  }

  /**
   * Find projects by status
   */
  async findByStatus(
    status: ProjectStatus,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Project[]> {
    const query = this.createQueryBuilder('project').where('project.status = :status', { status });

    if (organizationId) {
      query.andWhere('project.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('project.isArchived = :isArchived', { isArchived: false });
    }

    query.orderBy('project.createdAt', 'DESC');

    return query.getMany();
  }

  /**
   * Find projects by health indicator
   */
  async findByHealth(
    health: ProjectHealth,
    organizationId?: number,
    includeArchived = false,
  ): Promise<Project[]> {
    const query = this.createQueryBuilder('project').where('project.health = :health', { health });

    if (organizationId) {
      query.andWhere('project.organizationId = :organizationId', { organizationId });
    }

    if (!includeArchived) {
      query.andWhere('project.isArchived = :isArchived', { isArchived: false });
    }

    query.orderBy('project.createdAt', 'DESC');

    return query.getMany();
  }

  /**
   * Find child projects
   */
  async findChildProjects(parentProjectId: number): Promise<Project[]> {
    return this.createQueryBuilder('project')
      .where('project.parentProjectId = :parentProjectId', { parentProjectId })
      .andWhere('project.isArchived = :isArchived', { isArchived: false })
      .orderBy('project.createdAt', 'ASC')
      .getMany();
  }

  /**
   * Find template projects
   */
  async findTemplates(organizationId?: number): Promise<Project[]> {
    const query = this.createQueryBuilder('project')
      .where('project.isTemplate = :isTemplate', { isTemplate: true })
      .andWhere('project.isArchived = :isArchived', { isArchived: false });

    if (organizationId) {
      query.andWhere('project.organizationId = :organizationId', { organizationId });
    }

    query.orderBy('project.name', 'ASC');

    return query.getMany();
  }

  /**
   * Check if project key exists
   */
  async projectKeyExists(projectKey: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('project')
      .where('project.projectKey = :projectKey', { projectKey });

    if (excludeId) {
      query.andWhere('project.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Get project dashboard statistics (optimized query)
   */
  async getDashboardStats(organizationId: number): Promise<{
    total: number;
    active: number;
    completed: number;
    onHold: number;
    cancelled: number;
    atRisk: number;
    overBudget: number;
    totalBudget: number;
    totalActualCost: number;
    totalBudgetedHours: number;
    totalActualHours: number;
  }> {
    const stats = await this.createQueryBuilder('project')
      .select('COUNT(*)', 'total')
      .addSelect(
        "COUNT(CASE WHEN project.status = 'ACTIVE' THEN 1 END)",
        'active',
      )
      .addSelect(
        "COUNT(CASE WHEN project.status = 'COMPLETED' THEN 1 END)",
        'completed',
      )
      .addSelect(
        "COUNT(CASE WHEN project.status = 'ON_HOLD' THEN 1 END)",
        'onHold',
      )
      .addSelect(
        "COUNT(CASE WHEN project.status = 'CANCELLED' THEN 1 END)",
        'cancelled',
      )
      .addSelect(
        "COUNT(CASE WHEN project.health = 'AT_RISK' THEN 1 END)",
        'atRisk',
      )
      .addSelect(
        "COUNT(CASE WHEN project.health = 'OVER_BUDGET' THEN 1 END)",
        'overBudget',
      )
      .addSelect('COALESCE(SUM(project.budgetedAmount), 0)', 'totalBudget')
      .addSelect('COALESCE(SUM(project.actualCostAmount), 0)', 'totalActualCost')
      .addSelect('COALESCE(SUM(project.budgetedHours), 0)', 'totalBudgetedHours')
      .addSelect('COALESCE(SUM(project.actualHours), 0)', 'totalActualHours')
      .where('project.organizationId = :organizationId', { organizationId })
      .andWhere('project.isArchived = :isArchived', { isArchived: false })
      .getRawOne();

    return {
      total: parseInt(stats.total) || 0,
      active: parseInt(stats.active) || 0,
      completed: parseInt(stats.completed) || 0,
      onHold: parseInt(stats.onHold) || 0,
      cancelled: parseInt(stats.cancelled) || 0,
      atRisk: parseInt(stats.atRisk) || 0,
      overBudget: parseInt(stats.overBudget) || 0,
      totalBudget: parseFloat(stats.totalBudget) || 0,
      totalActualCost: parseFloat(stats.totalActualCost) || 0,
      totalBudgetedHours: parseFloat(stats.totalBudgetedHours) || 0,
      totalActualHours: parseFloat(stats.totalActualHours) || 0,
    };
  }

  /**
   * Find projects with budget alerts (over budget or at risk)
   */
  async findProjectsWithBudgetAlerts(
    organizationId: number,
    thresholdPercentage = 10,
  ): Promise<Project[]> {
    return this.createQueryBuilder('project')
      .where('project.organizationId = :organizationId', { organizationId })
      .andWhere('project.isArchived = :isArchived', { isArchived: false })
      .andWhere(
        `(project.actualCostAmount > project.budgetedAmount * (1 + :threshold / 100) OR project.health IN ('AT_RISK', 'OVER_BUDGET', 'CRITICAL'))`,
        { threshold: thresholdPercentage },
      )
      .orderBy('project.actualCostAmount', 'DESC')
      .getMany();
  }
}


