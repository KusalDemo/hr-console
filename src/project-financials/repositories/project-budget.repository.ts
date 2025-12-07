import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProjectBudget, BudgetCategory, BudgetStatus } from '../entities/project-budget.entity';

/**
 * Project Budget Repository
 *
 * Custom repository methods for budget queries with aggregation for financial reports.
 */
@Injectable()
export class ProjectBudgetRepository extends Repository<ProjectBudget> {
  constructor(private dataSource: DataSource) {
    super(ProjectBudget, dataSource.createEntityManager());
  }

  /**
   * Find budgets by project
   */
  async findByProject(projectId: number, includeRelations = false): Promise<ProjectBudget[]> {
    const query = this.createQueryBuilder('budget')
      .where('budget.projectId = :projectId', { projectId })
      .orderBy('budget.version', 'DESC')
      .addOrderBy('budget.createdAt', 'DESC');

    if (includeRelations) {
      query.leftJoinAndSelect('budget.project', 'project');
    }

    return query.getMany();
  }

  /**
   * Find budget by ID
   */
  async findById(id: number, includeRelations = false): Promise<ProjectBudget | null> {
    const query = this.createQueryBuilder('budget').where('budget.id = :id', { id });

    if (includeRelations) {
      query.leftJoinAndSelect('budget.project', 'project');
    }

    return query.getOne();
  }

  /**
   * Find budgets by category
   */
  async findByCategory(category: BudgetCategory, projectId?: number): Promise<ProjectBudget[]> {
    const query = this.createQueryBuilder('budget')
      .where('budget.category = :category', { category })
      .orderBy('budget.createdAt', 'DESC');

    if (projectId) {
      query.andWhere('budget.projectId = :projectId', { projectId });
    }

    return query.getMany();
  }

  /**
   * Find budgets by status
   */
  async findByStatus(status: BudgetStatus, projectId?: number): Promise<ProjectBudget[]> {
    const query = this.createQueryBuilder('budget')
      .where('budget.status = :status', { status })
      .orderBy('budget.createdAt', 'DESC');

    if (projectId) {
      query.andWhere('budget.projectId = :projectId', { projectId });
    }

    return query.getMany();
  }

  /**
   * Get budget summary by project (aggregated)
   */
  async getBudgetSummary(projectId: number): Promise<{
    totalBudgeted: number;
    totalActual: number;
    totalCommitted: number;
    totalAvailable: number;
    totalVariance: number;
    variancePercentage: number;
    byCategory: Array<{
      category: BudgetCategory;
      budgeted: number;
      actual: number;
      committed: number;
      variance: number;
    }>;
  }> {
    const budgets = await this.findByProject(projectId);

    const summary = {
      totalBudgeted: 0,
      totalActual: 0,
      totalCommitted: 0,
      totalAvailable: 0,
      totalVariance: 0,
      variancePercentage: 0,
      byCategory: [] as Array<{
        category: BudgetCategory;
        budgeted: number;
        actual: number;
        committed: number;
        variance: number;
      }>,
    };

    const categoryMap = new Map<
      BudgetCategory,
      {
        budgeted: number;
        actual: number;
        committed: number;
      }
    >();

    for (const budget of budgets) {
      summary.totalBudgeted += budget.budgetedAmount;
      summary.totalActual += budget.actualCostAmount;
      summary.totalCommitted += budget.committedAmount;

      const categoryData = categoryMap.get(budget.category) || {
        budgeted: 0,
        actual: 0,
        committed: 0,
      };

      categoryData.budgeted += budget.budgetedAmount;
      categoryData.actual += budget.actualCostAmount;
      categoryData.committed += budget.committedAmount;

      categoryMap.set(budget.category, categoryData);
    }

    summary.totalAvailable = summary.totalBudgeted - summary.totalActual - summary.totalCommitted;
    summary.totalVariance = summary.totalActual - summary.totalBudgeted;
    summary.variancePercentage =
      summary.totalBudgeted > 0 ? (summary.totalVariance / summary.totalBudgeted) * 100 : 0;

    // Convert category map to array
    for (const [category, data] of categoryMap.entries()) {
      summary.byCategory.push({
        category,
        budgeted: data.budgeted,
        actual: data.actual,
        committed: data.committed,
        variance: data.actual - data.budgeted,
      });
    }

    return summary;
  }

  /**
   * Get budgets with alerts (over budget or at risk)
   */
  async findBudgetsWithAlerts(
    projectId: number,
    thresholdPercentage = 10,
  ): Promise<ProjectBudget[]> {
    return this.createQueryBuilder('budget')
      .where('budget.projectId = :projectId', { projectId })
      .andWhere(
        `(budget.actual_cost_amount > budget.budgeted_amount * (1 + :threshold / 100) OR 
         (budget.actual_cost_amount + budget.committed_amount) > budget.budgeted_amount * 0.9)`,
        { threshold: thresholdPercentage },
      )
      .orderBy('budget.actual_cost_amount', 'DESC')
      .getMany();
  }

  /**
   * Get latest budget version for project
   */
  async getLatestVersion(projectId: number): Promise<number> {
    const result = await this.createQueryBuilder('budget')
      .select('MAX(budget.version)', 'maxVersion')
      .where('budget.projectId = :projectId', { projectId })
      .getRawOne();

    return parseInt(result?.maxVersion || '0');
  }
}

