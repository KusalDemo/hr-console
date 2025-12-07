import { ProjectTeam, ProjectTeamRole } from '../entities/project-team.entity';

/**
 * Project Team Response DTO
 */
export class ProjectTeamResponseDto {
  id: number;
  projectId: number;
  employeeId: number;
  role: ProjectTeamRole;
  allocationPercentage: number;
  startDate: Date | null;
  endDate: Date | null;
  hourlyRate: number | null;
  isActive: boolean;
  assignmentMetadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  // Employee info (if included)
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string | null;
  };

  static fromEntity(team: ProjectTeam, includeEmployee = false): ProjectTeamResponseDto {
    const dto = new ProjectTeamResponseDto();
    dto.id = team.id;
    dto.projectId = team.projectId;
    dto.employeeId = team.employeeId;
    dto.role = team.role;
    dto.allocationPercentage = team.allocationPercentage;
    dto.startDate = team.startDate;
    dto.endDate = team.endDate;
    dto.hourlyRate = team.hourlyRate;
    dto.isActive = team.isActive;
    dto.assignmentMetadata = team.assignmentMetadata;
    dto.createdAt = team.createdAt;
    dto.updatedAt = team.updatedAt;
    dto.createdBy = team.createdBy;
    dto.updatedBy = team.updatedBy;

    if (includeEmployee && team.employee) {
      const employee = team.employee as any;
      dto.employee = {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        jobTitle: employee.jobTitle,
      };
    }

    return dto;
  }
}

