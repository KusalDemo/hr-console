import { SupportTicket } from '../entities/support-ticket.entity';

/**
 * Support Ticket Response DTO
 */
export class SupportTicketResponseDto {
  id: number;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  categoryId: number | null;
  organizationId: number;
  requesterId: number;
  assignedToId: number | null;
  slaId: number | null;
  firstResponseDueAt: Date | null;
  firstResponseAt: Date | null;
  resolutionDueAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  totalTimeMinutes: number;
  tags: string[] | null;
  customFields: Record<string, any> | null;
  satisfactionRating: number | null;
  satisfactionFeedback: string | null;
  isEscalated: boolean;
  escalationReason: string | null;
  escalatedAt: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  static fromEntity(entity: SupportTicket): SupportTicketResponseDto {
    const dto = new SupportTicketResponseDto();
    dto.id = entity.id;
    dto.ticketNumber = entity.ticketNumber;
    dto.subject = entity.subject;
    dto.description = entity.description;
    dto.status = entity.status;
    dto.priority = entity.priority;
    dto.categoryId = entity.categoryId;
    dto.organizationId = entity.organizationId;
    dto.requesterId = entity.requesterId;
    dto.assignedToId = entity.assignedToId;
    dto.slaId = entity.slaId;
    dto.firstResponseDueAt = entity.firstResponseDueAt;
    dto.firstResponseAt = entity.firstResponseAt;
    dto.resolutionDueAt = entity.resolutionDueAt;
    dto.resolvedAt = entity.resolvedAt;
    dto.closedAt = entity.closedAt;
    dto.totalTimeMinutes = entity.totalTimeMinutes;
    dto.tags = entity.tags;
    dto.customFields = entity.customFields;
    dto.satisfactionRating = entity.satisfactionRating;
    dto.satisfactionFeedback = entity.satisfactionFeedback;
    dto.isEscalated = entity.isEscalated;
    dto.escalationReason = entity.escalationReason;
    dto.escalatedAt = entity.escalatedAt;
    dto.metadata = entity.metadata;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.createdBy = entity.createdBy;
    dto.updatedBy = entity.updatedBy;
    return dto;
  }
}
