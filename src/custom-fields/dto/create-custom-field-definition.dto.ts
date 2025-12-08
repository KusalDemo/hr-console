import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomFieldType } from '../entities/custom-field-definition.entity';

/**
 * Option DTO for dropdown/multi-select fields
 */
export class FieldOptionDto {
  @IsString()
  value: string;

  @IsString()
  label: string;
}

/**
 * Create Custom Field Definition DTO
 */
export class CreateCustomFieldDefinitionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  entityType: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  fieldKey: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fieldName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(CustomFieldType)
  fieldType: CustomFieldType;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsObject()
  validationRules?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  options?: FieldOptionDto[];

  @IsOptional()
  @IsObject()
  referenceConfig?: Record<string, any>;

  @IsOptional()
  @IsString()
  formula?: string;

  @IsOptional()
  @IsObject()
  visibilityRules?: Record<string, any>;

  @IsOptional()
  @IsObject()
  permissions?: Record<string, string[]>;

  @IsOptional()
  @IsNumber()
  organizationId?: number;

  @IsOptional()
  @IsObject()
  fieldMetadata?: Record<string, any>;
}


