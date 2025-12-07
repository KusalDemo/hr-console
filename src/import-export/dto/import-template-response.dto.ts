import { ImportTemplate } from '../entities/import-template.entity';

/**
 * Import Template Response DTO
 */
export class ImportTemplateResponseDto {
  id: number;
  name: string;
  description: string | null;
  entityType: string;
  importFormat: string;
  organizationId: number | null;
  fieldMappings: Record<string, string>;
  validationRules: Record<string, any> | null;
  transformationRules: Record<string, any> | null;
  defaultValues: Record<string, any> | null;
  duplicateDetection: Record<string, any> | null;
  mergeStrategy: string | null;
  rollbackOnFailure: boolean;
  batchSize: number;
  isActive: boolean;
  isSystem: boolean;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  static fromEntity(entity: ImportTemplate): ImportTemplateResponseDto {
    const dto = new ImportTemplateResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.entityType = entity.entityType;
    dto.importFormat = entity.importFormat;
    dto.organizationId = entity.organizationId;
    dto.fieldMappings = entity.fieldMappings;
    dto.validationRules = entity.validationRules;
    dto.transformationRules = entity.transformationRules;
    dto.defaultValues = entity.defaultValues;
    dto.duplicateDetection = entity.duplicateDetection;
    dto.mergeStrategy = entity.mergeStrategy;
    dto.rollbackOnFailure = entity.rollbackOnFailure;
    dto.batchSize = entity.batchSize;
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
