import { TicketSLA } from '../entities/ticket-sla.entity';

/**
 * Ticket SLA Response DTO
 */
export class TicketSLAResponseDto {
  id: number;
  name: string;
  description: string | null;
  organizationId: number | null;
  firstResponseTime: number;
  firstResponseTimeUnit: string;
  resolutionTime: number;
  resolutionTimeUnit: string;
  businessHours: Record<string, any> | null;
  businessHoursOnly: boolean;
  priorityOverrides: Record<string, any> | null;
  escalationRules: Record<string, any> | null;
  isActive: boolean;
  isDefault: boolean;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  static fromEntity(entity: TicketSLA): TicketSLAResponseDto {
    const dto = new TicketSLAResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.organizationId = entity.organizationId;
    dto.firstResponseTime = entity.firstResponseTime;
    dto.firstResponseTimeUnit = entity.firstResponseTimeUnit;
    dto.resolutionTime = entity.resolutionTime;
    dto.resolutionTimeUnit = entity.resolutionTimeUnit;
    dto.businessHours = entity.businessHours;
    dto.businessHoursOnly = entity.businessHoursOnly;
    dto.priorityOverrides = entity.priorityOverrides;
    dto.escalationRules = entity.escalationRules;
    dto.isActive = entity.isActive;
    dto.isDefault = entity.isDefault;
    dto.metadata = entity.metadata;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.createdBy = entity.createdBy;
    dto.updatedBy = entity.updatedBy;
    return dto;
  }
}
