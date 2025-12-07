import { AuditLog } from '../entities/audit-log.entity';

/**
 * Audit Log Response DTO
 */
export class AuditLogResponseDto {
  id: number;
  activityType: string;
  activityCategory: string | null;
  actorType: string;
  actorId: number | null;
  actorName: string | null;
  targetType: string | null;
  targetId: number | null;
  targetName: string | null;
  organizationId: number | null;
  description: string | null;
  metadata: Record<string, any> | null;
  beforeValues: Record<string, any> | null;
  afterValues: Record<string, any> | null;
  fieldChanges: Record<string, { before: any; after: any }> | null;
  changeSummary: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  requestId: string | null;
  auditLevel: string;
  complianceTags: string[] | null;
  isPublic: boolean;
  isArchived: boolean;
  archivedAt: Date | null;
  archivedBy: number | null;
  retentionUntil: Date | null;
  isImmutable: boolean;
  createdAt: Date;

  static fromEntity(entity: AuditLog): AuditLogResponseDto {
    const dto = new AuditLogResponseDto();
    dto.id = entity.id;
    dto.activityType = entity.activityType;
    dto.activityCategory = entity.activityCategory;
    dto.actorType = entity.actorType;
    dto.actorId = entity.actorId;
    dto.actorName = entity.actorName;
    dto.targetType = entity.targetType;
    dto.targetId = entity.targetId;
    dto.targetName = entity.targetName;
    dto.organizationId = entity.organizationId;
    dto.description = entity.description;
    dto.metadata = entity.metadata;
    dto.beforeValues = entity.beforeValues;
    dto.afterValues = entity.afterValues;
    dto.fieldChanges = entity.fieldChanges;
    dto.changeSummary = entity.changeSummary;
    dto.ipAddress = entity.ipAddress;
    dto.userAgent = entity.userAgent;
    dto.sessionId = entity.sessionId;
    dto.requestId = entity.requestId;
    dto.auditLevel = entity.auditLevel;
    dto.complianceTags = entity.complianceTags;
    dto.isPublic = entity.isPublic;
    dto.isArchived = entity.isArchived;
    dto.archivedAt = entity.archivedAt;
    dto.archivedBy = entity.archivedBy;
    dto.retentionUntil = entity.retentionUntil;
    dto.isImmutable = entity.isImmutable;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
