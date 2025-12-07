import { ExportJob } from '../entities/export-job.entity';

/**
 * Export Job Response DTO
 */
export class ExportJobResponseDto {
  id: number;
  templateId: number | null;
  entityType: string;
  exportFormat: string;
  status: string;
  organizationId: number;
  fileName: string | null;
  fileSize: number | null;
  filePath: string | null;
  totalRecords: number;
  progressPercentage: number;
  errorMessage: string | null;
  errorDetails: Record<string, any> | null;
  exportQuery: Record<string, any> | null;
  fieldSelection: string[] | null;
  filters: Record<string, any> | null;
  sorting: Record<string, any> | null;
  deliveryMethod: string;
  emailRecipients: string[] | null;
  emailSubject: string | null;
  emailBody: string | null;
  emailSent: boolean;
  emailSentAt: Date | null;
  isScheduled: boolean;
  scheduledAt: Date | null;
  scheduleRecurrence: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  static fromEntity(entity: ExportJob): ExportJobResponseDto {
    const dto = new ExportJobResponseDto();
    dto.id = entity.id;
    dto.templateId = entity.templateId;
    dto.entityType = entity.entityType;
    dto.exportFormat = entity.exportFormat;
    dto.status = entity.status;
    dto.organizationId = entity.organizationId;
    dto.fileName = entity.fileName;
    dto.fileSize = entity.fileSize;
    dto.filePath = entity.filePath;
    dto.totalRecords = entity.totalRecords;
    dto.progressPercentage = entity.progressPercentage;
    dto.errorMessage = entity.errorMessage;
    dto.errorDetails = entity.errorDetails;
    dto.exportQuery = entity.exportQuery;
    dto.fieldSelection = entity.fieldSelection;
    dto.filters = entity.filters;
    dto.sorting = entity.sorting;
    dto.deliveryMethod = entity.deliveryMethod;
    dto.emailRecipients = entity.emailRecipients;
    dto.emailSubject = entity.emailSubject;
    dto.emailBody = entity.emailBody;
    dto.emailSent = entity.emailSent;
    dto.emailSentAt = entity.emailSentAt;
    dto.isScheduled = entity.isScheduled;
    dto.scheduledAt = entity.scheduledAt;
    dto.scheduleRecurrence = entity.scheduleRecurrence;
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
