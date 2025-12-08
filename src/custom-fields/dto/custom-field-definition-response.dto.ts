import { CustomFieldType } from '../entities/custom-field-definition.entity';

/**
 * Custom Field Definition Response DTO
 */
export class CustomFieldDefinitionResponseDto {
  id: number;
  entityType: string;
  fieldKey: string;
  fieldName: string;
  description: string | null;
  fieldType: CustomFieldType;
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
  defaultValue: string | null;
  validationRules: Record<string, any> | null;
  options: Array<{ value: string; label: string }> | null;
  referenceConfig: Record<string, any> | null;
  formula: string | null;
  visibilityRules: Record<string, any> | null;
  permissions: Record<string, string[]> | null;
  organizationId: number | null;
  fieldMetadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;
}


