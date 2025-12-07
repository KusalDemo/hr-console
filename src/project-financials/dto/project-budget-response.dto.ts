import { ProjectBudget, BudgetCategory, BudgetStatus } from '../entities/project-budget.entity';

/**
 * Project Budget Response DTO
 */
export class ProjectBudgetResponseDto {
  id: number;
  projectId: number;
  version: number;
  name: string;
  category: BudgetCategory;
  budgetedAmount: number;
  actualCostAmount: number;
  committedAmount: number;
  status: BudgetStatus;
  periodStartDate: Date | null;
  periodEndDate: Date | null;
  notes: string | null;
  budgetMetadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  // Computed fields
  variance?: number;
  variancePercentage?: number;
  availableBudget?: number;
  isOverBudget?: boolean;
  isAtRisk?: boolean;

  static fromEntity(budget: ProjectBudget): ProjectBudgetResponseDto {
    const dto = new ProjectBudgetResponseDto();
    dto.id = budget.id;
    dto.projectId = budget.projectId;
    dto.version = budget.version;
    dto.name = budget.name;
    dto.category = budget.category;
    dto.budgetedAmount = budget.budgetedAmount;
    dto.actualCostAmount = budget.actualCostAmount;
    dto.committedAmount = budget.committedAmount;
    dto.status = budget.status;
    dto.periodStartDate = budget.periodStartDate;
    dto.periodEndDate = budget.periodEndDate;
    dto.notes = budget.notes;
    dto.budgetMetadata = budget.budgetMetadata;
    dto.createdAt = budget.createdAt;
    dto.updatedAt = budget.updatedAt;
    dto.createdBy = budget.createdBy;
    dto.updatedBy = budget.updatedBy;

    // Computed fields
    dto.variance = budget.getVariance();
    dto.variancePercentage = budget.getVariancePercentage();
    dto.availableBudget = budget.getAvailableBudget();
    dto.isOverBudget = budget.isOverBudget();
    dto.isAtRisk = budget.isAtRisk();

    return dto;
  }
}

