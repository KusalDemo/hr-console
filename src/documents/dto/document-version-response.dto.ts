import { DocumentVersion } from '../entities';

export class DocumentVersionResponseDto {
  id: number;
  documentId: number;
  versionNumber: number;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  fileHash: string | null;
  changeDescription: string | null;
  isCurrent: boolean;
  createdBy: number;
  metadata: Record<string, any> | null;
  createdAt: Date;

  static fromEntity(entity: DocumentVersion): DocumentVersionResponseDto {
    const dto = new DocumentVersionResponseDto();
    dto.id = entity.id;
    dto.documentId = entity.documentId;
    dto.versionNumber = entity.versionNumber;
    dto.filePath = entity.filePath;
    dto.fileName = entity.fileName;
    dto.fileSize = entity.fileSize;
    dto.mimeType = entity.mimeType;
    dto.fileHash = entity.fileHash;
    dto.changeDescription = entity.changeDescription;
    dto.isCurrent = entity.isCurrent;
    dto.createdBy = entity.createdBy;
    dto.metadata = entity.metadata;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
