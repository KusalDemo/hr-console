import { CustomFieldDefinitionResponseDto } from './custom-field-definition-response.dto';

/**
 * Custom Field Value Response DTO
 */
export class CustomFieldValueResponseDto {
  id: number;
  entityType: string;
  entityId: number;
  fieldDefinitionId: number;
  fieldDefinition?: CustomFieldDefinitionResponseDto;
  organizationId: number | null;
  textValue: string | null;
  numberValue: number | null;
  decimalValue: number | null;
  booleanValue: boolean | null;
  dateValue: Date | null;
  datetimeValue: Date | null;
  jsonValue: any | null;
  fileValue: string | null;
  valueMetadata: Record<string, any> | null;
  value: any; // Computed value based on field type
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;
}

