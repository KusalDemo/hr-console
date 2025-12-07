import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  IsEnum,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create Import Template DTO
 */
export class CreateImportTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  entityType: string;

  @IsOptional()
  @IsEnum(['CSV', 'EXCEL', 'JSON'])
  importFormat?: string;

  @IsOptional()
  @IsNumber()
  organizationId?: number;

  @IsObject()
  fieldMappings: Record<string, string>;

  @IsOptional()
  @IsObject()
  validationRules?: Record<string, any>;

  @IsOptional()
  @IsObject()
  transformationRules?: Record<string, any>;

  @IsOptional()
  @IsObject()
  defaultValues?: Record<string, any>;

  @IsOptional()
  @IsObject()
  duplicateDetection?: Record<string, any>;

  @IsOptional()
  @IsString()
  mergeStrategy?: string;

  @IsOptional()
  @IsBoolean()
  rollbackOnFailure?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  batchSize?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
