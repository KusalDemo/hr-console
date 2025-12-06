import { ProjectPhase, PhaseStatus } from '../entities/project-phase.entity';

/**
 * Project Phase Response DTO
 */
export class ProjectPhaseResponseDto {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  sequence: number;
  status: PhaseStatus;
  startDate: Date | null;
  endDate: Date | null;
  actualCompletionDate: Date | null;
  budgetedAmount: number;
  actualCostAmount: number;
  budgetedHours: number;
  actualHours: number;
  phaseMetadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  // Computed fields
  completionPercentage?: number;

  static fromEntity(phase: ProjectPhase): ProjectPhaseResponseDto {
    const dto = new ProjectPhaseResponseDto();
    dto.id = phase.id;
    dto.projectId = phase.projectId;
    dto.name = phase.name;
    dto.description = phase.description;
    dto.sequence = phase.sequence;
    dto.status = phase.status;
    dto.startDate = phase.startDate;
    dto.endDate = phase.endDate;
    dto.actualCompletionDate = phase.actualCompletionDate;
    dto.budgetedAmount = phase.budgetedAmount;
    dto.actualCostAmount = phase.actualCostAmount;
    dto.budgetedHours = phase.budgetedHours;
    dto.actualHours = phase.actualHours;
    dto.phaseMetadata = phase.phaseMetadata;
    dto.createdAt = phase.createdAt;
    dto.updatedAt = phase.updatedAt;
    dto.createdBy = phase.createdBy;
    dto.updatedBy = phase.updatedBy;

    // Computed fields
    dto.completionPercentage = phase.getCompletionPercentage();

    return dto;
  }
}

