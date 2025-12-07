import { Project, ProjectStatus, ProjectPriority, ProjectHealth } from '../entities/project.entity';
import { ProjectPhaseResponseDto } from './project-phase-response.dto';
import { ProjectTeamResponseDto } from './project-team-response.dto';

/**
 * Project Response DTO
 */
export class ProjectResponseDto {
  id: number;
  projectKey: string;
  name: string;
  description: string | null;
  organizationId: number;
  parentProjectId: number | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  health: ProjectHealth;
  startDate: Date | null;
  endDate: Date | null;
  actualCompletionDate: Date | null;
  projectManagerId: number | null;
  clientId: number | null;
  budgetedAmount: number;
  actualCostAmount: number;
  budgetedHours: number;
  actualHours: number;
  estimatedHours: number;
  budgetedRevenue: number;
  actualRevenue: number;
  isTemplate: boolean;
  templateId: number | null;
  isArchived: boolean;
  archivedAt: Date | null;
  archivedBy: number | null;
  projectMetadata: Record<string, any> | null;
  phases?: ProjectPhaseResponseDto[];
  teamMembers?: ProjectTeamResponseDto[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  // Computed fields
  budgetVariance?: number;
  budgetVariancePercentage?: number;
  hoursVariance?: number;
  completionPercentage?: number;
  isOnBudget?: boolean;
  isOnSchedule?: boolean;

  static fromEntity(project: Project, includeRelations = false): ProjectResponseDto {
    const dto = new ProjectResponseDto();
    dto.id = project.id;
    dto.projectKey = project.projectKey;
    dto.name = project.name;
    dto.description = project.description;
    dto.organizationId = project.organizationId;
    dto.parentProjectId = project.parentProjectId;
    dto.status = project.status;
    dto.priority = project.priority;
    dto.health = project.health;
    dto.startDate = project.startDate;
    dto.endDate = project.endDate;
    dto.actualCompletionDate = project.actualCompletionDate;
    dto.projectManagerId = project.projectManagerId;
    dto.clientId = project.clientId;
    dto.budgetedAmount = project.budgetedAmount;
    dto.actualCostAmount = project.actualCostAmount;
    dto.budgetedHours = project.budgetedHours;
    dto.actualHours = project.actualHours;
    dto.estimatedHours = project.estimatedHours;
    dto.budgetedRevenue = project.budgetedRevenue;
    dto.actualRevenue = project.actualRevenue;
    dto.isTemplate = project.isTemplate;
    dto.templateId = project.templateId;
    dto.isArchived = project.isArchived;
    dto.archivedAt = project.archivedAt;
    dto.archivedBy = project.archivedBy;
    dto.projectMetadata = project.projectMetadata;
    dto.createdAt = project.createdAt;
    dto.updatedAt = project.updatedAt;
    dto.createdBy = project.createdBy;
    dto.updatedBy = project.updatedBy;

    // Computed fields
    dto.budgetVariance = project.getBudgetVariance();
    dto.budgetVariancePercentage = project.getBudgetVariancePercentage();
    dto.hoursVariance = project.getHoursVariance();
    dto.completionPercentage = project.getCompletionPercentage();
    dto.isOnBudget = project.isOnBudget();
    dto.isOnSchedule = project.isOnSchedule();

    if (includeRelations) {
      if (project.phases && Array.isArray(project.phases)) {
        dto.phases = project.phases.map((phase) => ProjectPhaseResponseDto.fromEntity(phase));
      }
      if (project.teamMembers && Array.isArray(project.teamMembers)) {
        dto.teamMembers = project.teamMembers.map((team) =>
          ProjectTeamResponseDto.fromEntity(team),
        );
      }
    }

    return dto;
  }
}

