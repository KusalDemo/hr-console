import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProjectBudgetRepository, ProjectCostRepository } from '../repositories';
import { ProjectRepository } from '../../projects/repositories/project.repository';
import { EmployeeRepository } from '../../employees/repositories/employee.repository';
import { TaskRepository } from '../../tasks/repositories/task.repository';
import { ProjectBudget, BudgetCategory, BudgetStatus } from '../entities/project-budget.entity';
import { ProjectCost, CostType, CostStatus } from '../entities/project-cost.entity';
import {
  CreateProjectBudgetDto,
  UpdateProjectBudgetDto,
  CreateProjectCostDto,
  UpdateProjectCostDto,
  ProjectBudgetResponseDto,
  ProjectCostResponseDto,
} from '../dto';

/**
 * Project Financial Service
 *
 * Manages project financials with:
 * - Budget management (budget lines, categories, versions)
 * - Cost tracking (labor, materials, expenses)
 * - Budget alerts and variance reporting
 * - Profitability analysis
 * - Integration with time tracking for labor costs
 * - Forecasting
 */
@Injectable()
export class ProjectFinancialService {
  private readonly logger = new Logger(ProjectFinancialService.name);

  constructor(
    private readonly projectBudgetRepository: ProjectBudgetRepository,
    private readonly projectCostRepository: ProjectCostRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly taskRepository: TaskRepository,
  ) {}

  // ========== Budget Management ==========

  /**
   * Create a new budget line
   */
  async createBudget(
    createDto: CreateProjectBudgetDto,
    createdBy?: number,
  ): Promise<ProjectBudgetResponseDto> {
    // Validate project exists
    const project = await this.projectRepository.findById(createDto.projectId);

    if (!project) {
      throw new NotFoundException(`Project with ID ${createDto.projectId} not found`);
    }

    // Get latest version if not provided
    const version =
      createDto.version ||
      (await this.projectBudgetRepository.getLatestVersion(createDto.projectId)) + 1;

    const budget = this.projectBudgetRepository.create({
      ...createDto,
      version,
      status: createDto.status || BudgetStatus.DRAFT,
      periodStartDate: createDto.periodStartDate ? new Date(createDto.periodStartDate) : null,
      periodEndDate: createDto.periodEndDate ? new Date(createDto.periodEndDate) : null,
      committedAmount: createDto.committedAmount || 0,
      createdBy,
    });

    const saved = await this.projectBudgetRepository.save(budget);

    // Update project budgeted amount
    await this.updateProjectBudgetTotals(createDto.projectId);

    this.logger.log(`Created budget line: ${saved.id} for project ${createDto.projectId}`);

    return ProjectBudgetResponseDto.fromEntity(saved);
  }

  /**
   * Update a budget line
   */
  async updateBudget(
    id: number,
    updateDto: UpdateProjectBudgetDto,
    updatedBy?: number,
  ): Promise<ProjectBudgetResponseDto> {
    const budget = await this.projectBudgetRepository.findById(id);

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    if (budget.status === BudgetStatus.LOCKED) {
      throw new BadRequestException('Cannot update locked budget');
    }

    Object.assign(budget, {
      ...updateDto,
      periodStartDate: updateDto.periodStartDate
        ? new Date(updateDto.periodStartDate)
        : budget.periodStartDate,
      periodEndDate: updateDto.periodEndDate
        ? new Date(updateDto.periodEndDate)
        : budget.periodEndDate,
      updatedBy,
    });

    const saved = await this.projectBudgetRepository.save(budget);

    // Update project budgeted amount
    await this.updateProjectBudgetTotals(budget.projectId);

    this.logger.log(`Updated budget line: ${id}`);

    return ProjectBudgetResponseDto.fromEntity(saved);
  }

  /**
   * Get budget by ID
   */
  async getBudgetById(id: number): Promise<ProjectBudgetResponseDto> {
    const budget = await this.projectBudgetRepository.findById(id);

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    return ProjectBudgetResponseDto.fromEntity(budget);
  }

  /**
   * Get budgets by project
   */
  async getBudgetsByProject(projectId: number): Promise<ProjectBudgetResponseDto[]> {
    const budgets = await this.projectBudgetRepository.findByProject(projectId);

    return budgets.map((budget) => ProjectBudgetResponseDto.fromEntity(budget));
  }

  /**
   * Get budget summary for project
   */
  async getBudgetSummary(projectId: number) {
    return this.projectBudgetRepository.getBudgetSummary(projectId);
  }

  /**
   * Get budgets with alerts
   */
  async getBudgetsWithAlerts(
    projectId: number,
    thresholdPercentage = 10,
  ): Promise<ProjectBudgetResponseDto[]> {
    const budgets = await this.projectBudgetRepository.findBudgetsWithAlerts(
      projectId,
      thresholdPercentage,
    );

    return budgets.map((budget) => ProjectBudgetResponseDto.fromEntity(budget));
  }

  /**
   * Delete a budget line
   */
  async deleteBudget(id: number): Promise<void> {
    const budget = await this.projectBudgetRepository.findById(id);

    if (!budget) {
      throw new NotFoundException(`Budget with ID ${id} not found`);
    }

    if (budget.status === BudgetStatus.LOCKED) {
      throw new BadRequestException('Cannot delete locked budget');
    }

    await this.projectBudgetRepository.remove(budget);

    // Update project budgeted amount
    await this.updateProjectBudgetTotals(budget.projectId);

    this.logger.log(`Deleted budget line: ${id}`);
  }

  // ========== Cost Management ==========

  /**
   * Create a new cost entry
   */
  async createCost(
    createDto: CreateProjectCostDto,
    createdBy?: number,
  ): Promise<ProjectCostResponseDto> {
    // Validate project exists
    const project = await this.projectRepository.findById(createDto.projectId);

    if (!project) {
      throw new NotFoundException(`Project with ID ${createDto.projectId} not found`);
    }

    // Validate employee if provided
    if (createDto.employeeId) {
      const employee = await this.employeeRepository.findById(createDto.employeeId);

      if (!employee) {
        throw new NotFoundException(`Employee with ID ${createDto.employeeId} not found`);
      }
    }

    // Validate task if provided
    if (createDto.taskId) {
      const task = await this.taskRepository.findById(createDto.taskId);

      if (!task) {
        throw new NotFoundException(`Task with ID ${createDto.taskId} not found`);
      }
    }

    // Calculate cost amount if quantity and unit price provided
    let costAmount = createDto.costAmount;
    if (createDto.quantity && createDto.unitPrice) {
      costAmount = createDto.quantity * createDto.unitPrice;
    }

    // Calculate cost amount for labor if hours and rate provided
    if (createDto.costType === CostType.LABOR && createDto.hours && createDto.hourlyRate) {
      costAmount = createDto.hours * createDto.hourlyRate;
    }

    // Calculate billing amount if billable
    let billingAmount = createDto.billingAmount;
    if (createDto.isBillable && createDto.billingRate) {
      if (createDto.hours) {
        billingAmount = createDto.hours * createDto.billingRate;
      } else if (createDto.quantity && createDto.billingRate) {
        billingAmount = createDto.quantity * createDto.billingRate;
      }
    }

    const cost = this.projectCostRepository.create({
      ...createDto,
      costAmount,
      billingAmount,
      costDate: new Date(createDto.costDate),
      status: createDto.status || CostStatus.PENDING,
      isBillable: createDto.isBillable || false,
      currency: createDto.currency || 'USD',
      createdBy,
    });

    const saved = await this.projectCostRepository.save(cost);

    // Update budget actual cost if budget line is specified
    if (saved.budgetLineId) {
      await this.updateBudgetActualCost(saved.budgetLineId);
    }

    // Update project actual cost
    await this.updateProjectCostTotals(createDto.projectId);

    this.logger.log(`Created cost entry: ${saved.id} for project ${createDto.projectId}`);

    const reloaded = await this.projectCostRepository.findById(saved.id, true);
    if (!reloaded) {
      throw new NotFoundException(`Project cost not found after save`);
    }
    return ProjectCostResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Update a cost entry
   */
  async updateCost(
    id: number,
    updateDto: UpdateProjectCostDto,
    updatedBy?: number,
  ): Promise<ProjectCostResponseDto> {
    const cost = await this.projectCostRepository.findById(id);

    if (!cost) {
      throw new NotFoundException(`Cost with ID ${id} not found`);
    }

    // Calculate cost amount if quantity and unit price provided
    let costAmount = updateDto.costAmount ?? cost.costAmount;
    if (updateDto.quantity !== undefined && updateDto.unitPrice !== undefined) {
      costAmount = updateDto.quantity * updateDto.unitPrice;
    }

    // Calculate cost amount for labor if hours and rate provided
    if (
      (updateDto.costType === CostType.LABOR || cost.costType === CostType.LABOR) &&
      updateDto.hours !== undefined &&
      updateDto.hourlyRate !== undefined
    ) {
      costAmount = updateDto.hours * updateDto.hourlyRate;
    }

    // Calculate billing amount if billable
    let billingAmount = updateDto.billingAmount ?? cost.billingAmount;
    if (updateDto.isBillable !== undefined && updateDto.billingRate !== undefined) {
      if (updateDto.hours !== undefined) {
        billingAmount = updateDto.hours * updateDto.billingRate;
      } else if (updateDto.quantity !== undefined) {
        billingAmount = updateDto.quantity * updateDto.billingRate;
      }
    }

    const oldBudgetLineId = cost.budgetLineId;

    Object.assign(cost, {
      ...updateDto,
      costAmount,
      billingAmount,
      costDate: updateDto.costDate ? new Date(updateDto.costDate) : cost.costDate,
      updatedBy,
    });

    const saved = await this.projectCostRepository.save(cost);

    // Update budget actual costs if budget line changed
    if (oldBudgetLineId !== saved.budgetLineId) {
      if (oldBudgetLineId) {
        await this.updateBudgetActualCost(oldBudgetLineId);
      }
      if (saved.budgetLineId) {
        await this.updateBudgetActualCost(saved.budgetLineId);
      }
    } else if (saved.budgetLineId) {
      await this.updateBudgetActualCost(saved.budgetLineId);
    }

    // Update project actual cost
    await this.updateProjectCostTotals(cost.projectId);

    this.logger.log(`Updated cost entry: ${id}`);

    const reloaded = await this.projectCostRepository.findById(saved.id, true);
    if (!reloaded) {
      throw new NotFoundException(`Project cost not found after save`);
    }
    return ProjectCostResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Get cost by ID
   */
  async getCostById(id: number): Promise<ProjectCostResponseDto> {
    const cost = await this.projectCostRepository.findById(id, true);

    if (!cost) {
      throw new NotFoundException(`Cost with ID ${id} not found`);
    }

    return ProjectCostResponseDto.fromEntity(cost, true);
  }

  /**
   * Get costs by project
   */
  async getCostsByProject(projectId: number): Promise<ProjectCostResponseDto[]> {
    const costs = await this.projectCostRepository.findByProject(projectId, true);

    return costs.map((cost) => ProjectCostResponseDto.fromEntity(cost, true));
  }

  /**
   * Get cost summary for project
   */
  async getCostSummary(projectId: number) {
    return this.projectCostRepository.getCostSummary(projectId);
  }

  /**
   * Get profitability analysis
   */
  async getProfitabilityAnalysis(projectId: number) {
    return this.projectCostRepository.getProfitabilityAnalysis(projectId);
  }

  /**
   * Delete a cost entry
   */
  async deleteCost(id: number): Promise<void> {
    const cost = await this.projectCostRepository.findById(id);

    if (!cost) {
      throw new NotFoundException(`Cost with ID ${id} not found`);
    }

    const budgetLineId = cost.budgetLineId;
    const projectId = cost.projectId;

    await this.projectCostRepository.remove(cost);

    // Update budget actual cost if budget line was specified
    if (budgetLineId) {
      await this.updateBudgetActualCost(budgetLineId);
    }

    // Update project actual cost
    await this.updateProjectCostTotals(projectId);

    this.logger.log(`Deleted cost entry: ${id}`);
  }

  // ========== Financial Reports ==========

  /**
   * Get variance report
   */
  async getVarianceReport(projectId: number) {
    const budgetSummary = await this.getBudgetSummary(projectId);
    const costSummary = await this.getCostSummary(projectId);

    return {
      budget: budgetSummary,
      cost: costSummary,
      overall: {
        budgeted: budgetSummary.totalBudgeted,
        actual: costSummary.totalCost,
        variance: costSummary.totalCost - budgetSummary.totalBudgeted,
        variancePercentage:
          budgetSummary.totalBudgeted > 0
            ? ((costSummary.totalCost - budgetSummary.totalBudgeted) /
                budgetSummary.totalBudgeted) *
              100
            : 0,
      },
    };
  }

  // ========== Private Helper Methods ==========

  /**
   * Update project budget totals from budget lines
   */
  private async updateProjectBudgetTotals(projectId: number): Promise<void> {
    const summary = await this.projectBudgetRepository.getBudgetSummary(projectId);

    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      return;
    }

    project.budgetedAmount = summary.totalBudgeted;
    await this.projectRepository.save(project);
  }

  /**
   * Update project cost totals from cost entries
   */
  private async updateProjectCostTotals(projectId: number): Promise<void> {
    const summary = await this.projectCostRepository.getCostSummary(projectId);

    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      return;
    }

    project.actualCostAmount = summary.totalCost;
    project.actualRevenue = summary.totalRevenue;
    await this.projectRepository.save(project);
  }

  /**
   * Update budget actual cost from cost entries
   */
  private async updateBudgetActualCost(budgetLineId: number): Promise<void> {
    const costs = await this.projectCostRepository
      .createQueryBuilder('cost')
      .where('cost.budgetLineId = :budgetLineId', { budgetLineId })
      .getMany();

    const totalActual = costs.reduce((sum, cost) => sum + cost.costAmount, 0);

    const budget = await this.projectBudgetRepository.findById(budgetLineId);

    if (!budget) {
      return;
    }

    budget.actualCostAmount = totalActual;
    await this.projectBudgetRepository.save(budget);
  }
}
