import { TicketCategory } from '../entities/ticket-category.entity';

/**
 * Ticket Category Response DTO
 */
export class TicketCategoryResponseDto {
  id: number;
  name: string;
  description: string | null;
  organizationId: number | null;
  defaultSlaId: number | null;
  defaultAssigneeId: number | null;
  displayOrder: number;
  isActive: boolean;
  icon: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  static fromEntity(entity: TicketCategory): TicketCategoryResponseDto {
    const dto = new TicketCategoryResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.organizationId = entity.organizationId;
    dto.defaultSlaId = entity.defaultSlaId;
    dto.defaultAssigneeId = entity.defaultAssigneeId;
    dto.displayOrder = entity.displayOrder;
    dto.isActive = entity.isActive;
    dto.icon = entity.icon;
    dto.metadata = entity.metadata;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.createdBy = entity.createdBy;
    dto.updatedBy = entity.updatedBy;
    return dto;
  }
}
