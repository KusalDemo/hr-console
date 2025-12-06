import { ProjectCost, CostType, CostStatus } from '../entities/project-cost.entity';

/**
 * Project Cost Response DTO
 */
export class ProjectCostResponseDto {
  id: number;
  projectId: number;
  budgetLineId: number | null;
  costType: CostType;
  description: string;
  costAmount: number;
  costDate: Date;
  quantity: number | null;
  unitPrice: number | null;
  employeeId: number | null;
  hours: number | null;
  hourlyRate: number | null;
  taskId: number | null;
  timeEntryId: number | null;
  vendor: string | null;
  invoiceNumber: string | null;
  receiptReference: string | null;
  status: CostStatus;
  isBillable: boolean;
  billingRate: number | null;
  billingAmount: number | null;
  currency: string | null;
  costMetadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  // Relations
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  task?: {
    id: number;
    taskKey: string;
    title: string;
  };

  // Computed fields
  profitMargin?: number | null;
  profitMarginPercentage?: number | null;
  isFromTimeTracking?: boolean;

  static fromEntity(cost: ProjectCost, includeRelations = false): ProjectCostResponseDto {
    const dto = new ProjectCostResponseDto();
    dto.id = cost.id;
    dto.projectId = cost.projectId;
    dto.budgetLineId = cost.budgetLineId;
    dto.costType = cost.costType;
    dto.description = cost.description;
    dto.costAmount = cost.costAmount;
    dto.costDate = cost.costDate;
    dto.quantity = cost.quantity;
    dto.unitPrice = cost.unitPrice;
    dto.employeeId = cost.employeeId;
    dto.hours = cost.hours;
    dto.hourlyRate = cost.hourlyRate;
    dto.taskId = cost.taskId;
    dto.timeEntryId = cost.timeEntryId;
    dto.vendor = cost.vendor;
    dto.invoiceNumber = cost.invoiceNumber;
    dto.receiptReference = cost.receiptReference;
    dto.status = cost.status;
    dto.isBillable = cost.isBillable;
    dto.billingRate = cost.billingRate;
    dto.billingAmount = cost.billingAmount;
    dto.currency = cost.currency;
    dto.costMetadata = cost.costMetadata;
    dto.createdAt = cost.createdAt;
    dto.updatedAt = cost.updatedAt;
    dto.createdBy = cost.createdBy;
    dto.updatedBy = cost.updatedBy;

    // Computed fields
    dto.profitMargin = cost.getProfitMargin();
    dto.profitMarginPercentage = cost.getProfitMarginPercentage();
    dto.isFromTimeTracking = cost.isFromTimeTracking();

    if (includeRelations) {
      if (cost.employee) {
        const employee = cost.employee as any;
        dto.employee = {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
        };
      }

      if (cost.task) {
        const task = cost.task as any;
        dto.task = {
          id: task.id,
          taskKey: task.taskKey,
          title: task.title,
        };
      }
    }

    return dto;
  }
}

