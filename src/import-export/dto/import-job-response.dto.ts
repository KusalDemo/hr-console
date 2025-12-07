import { ImportJob } from '../entities/import-job.entity';

/**
 * Import Job Response DTO
 */
export class ImportJobResponseDto {
  id: number;
  templateId: number | null;
  entityType: string;
  importFormat: string;
  status: string;
  organizationId: number;
  fileName: string;
  fileSize: number;
  filePath: string;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  skippedRecords: number;
  progressPercentage: number;
  errorMessage: string | null;
  errorDetails: Record<string, any> | null;
  rowErrors: Array<{ row: number; errors: string[]; data: any }> | null;
  importConfig: Record<string, any> | null;
  rollbackOnFailure: boolean;
  isIncremental: boolean;
  duplicateStrategy: string | null;
  batchSize: number;
  startedAt: Date | null;
  completedAt: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  static fromEntity(entity: ImportJob): ImportJobResponseDto {
    const dto = new ImportJobResponseDto();
    dto.id = entity.id;
    dto.templateId = entity.templateId;
    dto.entityType = entity.entityType;
    dto.importFormat = entity.importFormat;
    dto.status = entity.status;
    dto.organizationId = entity.organizationId;
    dto.fileName = entity.fileName;
    dto.fileSize = entity.fileSize;
    dto.filePath = entity.filePath;
    dto.totalRecords = entity.totalRecords;
    dto.processedRecords = entity.processedRecords;
    dto.failedRecords = entity.failedRecords;
    dto.skippedRecords = entity.skippedRecords;
    dto.progressPercentage = entity.progressPercentage;
    dto.errorMessage = entity.errorMessage;
    dto.errorDetails = entity.errorDetails;
    dto.rowErrors = entity.rowErrors;
    dto.importConfig = entity.importConfig;
    dto.rollbackOnFailure = entity.rollbackOnFailure;
    dto.isIncremental = entity.isIncremental;
    dto.duplicateStrategy = entity.duplicateStrategy;
    dto.batchSize = entity.batchSize;
    dto.startedAt = entity.startedAt;
    dto.completedAt = entity.completedAt;
    dto.metadata = entity.metadata;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.createdBy = entity.createdBy;
    dto.updatedBy = entity.updatedBy;
    return dto;
  }
}
