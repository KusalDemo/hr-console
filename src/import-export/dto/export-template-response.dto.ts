import { ExportTemplate } from '../entities/export-template.entity';

/**
 * Export Template Response DTO
 */
export class ExportTemplateResponseDto {
  id: number;
  name: string;
  description: string | null;
  entityType: string;
  exportFormat: string;
  organizationId: number | null;
  fieldSelection: string[] | null;
  formattingRules: Record<string, any> | null;
  defaultFilters: Record<string, any> | null;
  defaultSorting: Record<string, any> | null;
  queryBuilderConfig: Record<string, any> | null;
  pdfTemplateConfig: Record<string, any> | null;
  excelTemplateConfig: Record<string, any> | null;
  supportsScheduling: boolean;
  defaultEmailRecipients: string[] | null;
  defaultEmailSubject: string | null;
  defaultEmailBody: string | null;
  isActive: boolean;
  isSystem: boolean;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  static fromEntity(entity: ExportTemplate): ExportTemplateResponseDto {
    const dto = new ExportTemplateResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.entityType = entity.entityType;
    dto.exportFormat = entity.exportFormat;
    dto.organizationId = entity.organizationId;
    dto.fieldSelection = entity.fieldSelection;
    dto.formattingRules = entity.formattingRules;
    dto.defaultFilters = entity.defaultFilters;
    dto.defaultSorting = entity.defaultSorting;
    dto.queryBuilderConfig = entity.queryBuilderConfig;
    dto.pdfTemplateConfig = entity.pdfTemplateConfig;
    dto.excelTemplateConfig = entity.excelTemplateConfig;
    dto.supportsScheduling = entity.supportsScheduling;
    dto.defaultEmailRecipients = entity.defaultEmailRecipients;
    dto.defaultEmailSubject = entity.defaultEmailSubject;
    dto.defaultEmailBody = entity.defaultEmailBody;
    dto.isActive = entity.isActive;
    dto.isSystem = entity.isSystem;
    dto.metadata = entity.metadata;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.createdBy = entity.createdBy;
    dto.updatedBy = entity.updatedBy;
    return dto;
  }
}
