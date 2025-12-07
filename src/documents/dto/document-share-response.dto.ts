import { DocumentShare } from '../entities';

export class DocumentShareResponseDto {
  id: number;
  documentId: number;
  sharedWithId: number | null;
  sharedWithRole: string | null;
  permissions: string[];
  shareLink: string | null;
  shareToken: string | null;
  expiresAt: Date | null;
  isActive: boolean;
  accessCount: number;
  lastAccessedAt: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number;

  static fromEntity(entity: DocumentShare): DocumentShareResponseDto {
    const dto = new DocumentShareResponseDto();
    dto.id = entity.id;
    dto.documentId = entity.documentId;
    dto.sharedWithId = entity.sharedWithId;
    dto.sharedWithRole = entity.sharedWithRole;
    dto.permissions = entity.permissions;
    dto.shareLink = entity.shareLink;
    dto.shareToken = entity.shareToken;
    dto.expiresAt = entity.expiresAt;
    dto.isActive = entity.isActive;
    dto.accessCount = entity.accessCount;
    dto.lastAccessedAt = entity.lastAccessedAt;
    dto.metadata = entity.metadata;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.createdBy = entity.createdBy;
    return dto;
  }
}
