import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProjectCost, CostType, CostStatus } from '../entities/project-cost.entity';

/**
 * Project Cost Repository
 * 
 * Custom repository methods for cost queries with aggregation for financial reports.
 */
@Injectable()
export class ProjectCostRepository extends Repository<ProjectCost> {
  constructor(private dataSource: DataSource) {
    super(ProjectCost, dataSource.createEntityManager());
  }

  /**
   * Find costs by project
   */
  async findByProject(
    projectId: number,
    includeRelations = false,
  ): Promise<ProjectCost[]> {
    const query = this.createQueryBuilder('cost')
      .where('cost.projectId = :projectId', { projectId })
      .orderBy('cost.costDate', 'DESC')
      .addOrderBy('cost.createdAt', 'DESC');

    if (includeRelations) {
      query
        .leftJoinAndSelect('cost.project', 'project')
        .leftJoinAndSelect('cost.employee', 'employee')
        .leftJoinAndSelect('cost.task', 'task');
    }

    return query.getMany();
  }

  /**
   * Find cost by ID
   */
  async findById(id: number, includeRelations = false): Promise<ProjectCost | null> {
    const query = this.createQueryBuilder('cost').where('cost.id = :id', { id });

    if (includeRelations) {
      query
        .leftJoinAndSelect('cost.project', 'project')
        .leftJoinAndSelect('cost.employee', 'employee')
        .leftJoinAndSelect('cost.task', 'task');
    }

    return query.getOne();
  }

  /**
   * Find costs by type
   */
  async findByType(
    costType: CostType,
    projectId?: number,
  ): Promise<ProjectCost[]> {
    const query = this.createQueryBuilder('cost')
      .where('cost.costType = :costType', { costType })
      .orderBy('cost.costDate', 'DESC');

    if (projectId) {
      query.andWhere('cost.projectId = :projectId', { projectId });
    }

    return query.getMany();
  }

  /**
   * Find costs by status
   */
  async findByStatus(
    status: CostStatus,
    projectId?: number,
  ): Promise<ProjectCost[]> {
    const query = this.createQueryBuilder('cost')
      .where('cost.status = :status', { status })
      .orderBy('cost.costDate', 'DESC');

    if (projectId) {
      query.andWhere('cost.projectId = :projectId', { projectId });
    }

    return query.getMany();
  }

  /**
   * Find costs by date range
   */
  async findByDateRange(
    projectId: number,
    startDate: Date,
    endDate: Date,
    includeRelations = false,
  ): Promise<ProjectCost[]> {
    const query = this.createQueryBuilder('cost')
      .where('cost.projectId = :projectId', { projectId })
      .andWhere('cost.costDate >= :startDate', { startDate })
      .andWhere('cost.costDate <= :endDate', { endDate })
      .orderBy('cost.costDate', 'ASC');

    if (includeRelations) {
      query
        .leftJoinAndSelect('cost.project', 'project')
        .leftJoinAndSelect('cost.employee', 'employee')
        .leftJoinAndSelect('cost.task', 'task');
    }

    return query.getMany();
  }

  /**
   * Get cost summary by project (aggregated)
   */
  async getCostSummary(projectId: number): Promise<{
    totalCost: number;
    totalBillable: number;
    totalRevenue: number;
    totalProfit: number;
    profitMargin: number;
    byType: Array<{
      costType: CostType;
      totalCost: number;
      totalBillable: number;
      count: number;
    }>;
    byStatus: Array<{
      status: CostStatus;
      totalCost: number;
      count: number;
    }>;
  }> {
    const costs = await this.findByProject(projectId);

    const summary = {
      totalCost: 0,
      totalBillable: 0,
      totalRevenue: 0,
      totalProfit: 0,
      profitMargin: 0,
      byType: [] as Array<{
        costType: CostType;
        totalCost: number;
        totalBillable: number;
        count: number;
      }>,
      byStatus: [] as Array<{
        status: CostStatus;
        totalCost: number;
        count: number;
      }>,
    };

    const typeMap = new Map<CostType, { totalCost: number; totalBillable: number; count: number }>();
    const statusMap = new Map<CostStatus, { totalCost: number; count: number }>();

    for (const cost of costs) {
      summary.totalCost += cost.costAmount;

      if (cost.isBillable && cost.billingAmount) {
        summary.totalBillable += cost.billingAmount;
        summary.totalRevenue += cost.billingAmount;
      }

      // Type aggregation
      const typeData = typeMap.get(cost.costType) || {
        totalCost: 0,
        totalBillable: 0,
        count: 0,
      };
      typeData.totalCost += cost.costAmount;
      if (cost.isBillable && cost.billingAmount) {
        typeData.totalBillable += cost.billingAmount;
      }
      typeData.count += 1;
      typeMap.set(cost.costType, typeData);

      // Status aggregation
      const statusData = statusMap.get(cost.status) || {
        totalCost: 0,
        count: 0,
      };
      statusData.totalCost += cost.costAmount;
      statusData.count += 1;
      statusMap.set(cost.status, statusData);
    }

    summary.totalProfit = summary.totalRevenue - summary.totalCost;
    summary.profitMargin =
      summary.totalRevenue > 0 ? (summary.totalProfit / summary.totalRevenue) * 100 : 0;

    // Convert maps to arrays
    for (const [costType, data] of typeMap.entries()) {
      summary.byType.push({
        costType,
        ...data,
      });
    }

    for (const [status, data] of statusMap.entries()) {
      summary.byStatus.push({
        status,
        ...data,
      });
    }

    return summary;
  }

  /**
   * Get costs by employee (for labor cost analysis)
   */
  async findByEmployee(
    employeeId: number,
    projectId?: number,
  ): Promise<ProjectCost[]> {
    const query = this.createQueryBuilder('cost')
      .where('cost.employeeId = :employeeId', { employeeId })
      .andWhere('cost.costType = :costType', { costType: CostType.LABOR })
      .orderBy('cost.costDate', 'DESC');

    if (projectId) {
      query.andWhere('cost.projectId = :projectId', { projectId });
    }

    return query.getMany();
  }

  /**
   * Get costs by task (for task-level cost tracking)
   */
  async findByTask(taskId: number): Promise<ProjectCost[]> {
    return this.createQueryBuilder('cost')
      .where('cost.taskId = :taskId', { taskId })
      .orderBy('cost.costDate', 'DESC')
      .getMany();
  }

  /**
   * Get labor costs from time tracking
   */
  async findLaborCostsFromTimeTracking(
    projectId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ProjectCost[]> {
    const query = this.createQueryBuilder('cost')
      .where('cost.projectId = :projectId', { projectId })
      .andWhere('cost.costType = :costType', { costType: CostType.LABOR })
      .andWhere('cost.timeEntryId IS NOT NULL')
      .orderBy('cost.costDate', 'DESC');

    if (startDate) {
      query.andWhere('cost.costDate >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('cost.costDate <= :endDate', { endDate });
    }

    return query.getMany();
  }

  /**
   * Get profitability analysis
   */
  async getProfitabilityAnalysis(projectId: number): Promise<{
    totalCost: number;
    totalRevenue: number;
    totalProfit: number;
    profitMargin: number;
    byCostType: Array<{
      costType: CostType;
      cost: number;
      revenue: number;
      profit: number;
      margin: number;
    }>;
  }> {
    const costs = await this.findByProject(projectId);

    const analysis = {
      totalCost: 0,
      totalRevenue: 0,
      totalProfit: 0,
      profitMargin: 0,
      byCostType: [] as Array<{
        costType: CostType;
        cost: number;
        revenue: number;
        profit: number;
        margin: number;
      }>,
    };

    const typeMap = new Map<CostType, { cost: number; revenue: number }>();

    for (const cost of costs) {
      analysis.totalCost += cost.costAmount;

      if (cost.isBillable && cost.billingAmount) {
        analysis.totalRevenue += cost.billingAmount;
      }

      const typeData = typeMap.get(cost.costType) || {
        cost: 0,
        revenue: 0,
      };
      typeData.cost += cost.costAmount;
      if (cost.isBillable && cost.billingAmount) {
        typeData.revenue += cost.billingAmount;
      }
      typeMap.set(cost.costType, typeData);
    }

    analysis.totalProfit = analysis.totalRevenue - analysis.totalCost;
    analysis.profitMargin =
      analysis.totalRevenue > 0 ? (analysis.totalProfit / analysis.totalRevenue) * 100 : 0;

    // Convert map to array
    for (const [costType, data] of typeMap.entries()) {
      const profit = data.revenue - data.cost;
      const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;

      analysis.byCostType.push({
        costType,
        cost: data.cost,
        revenue: data.revenue,
        profit,
        margin,
      });
    }

    return analysis;
  }
}


