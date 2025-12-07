import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  IsArray,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * Create Export Template DTO
 */
export class CreateExportTemplateDto {
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
  @IsEnum(['PDF', 'EXCEL', 'CSV', 'JSON'])
  exportFormat?: string;

  @IsOptional()
  @IsNumber()
  organizationId?: number;

  @IsOptional()
  @IsArray()
  fieldSelection?: string[];

  @IsOptional()
  @IsObject()
  formattingRules?: Record<string, any>;

  @IsOptional()
  @IsObject()
  defaultFilters?: Record<string, any>;

  @IsOptional()
  @IsObject()
  defaultSorting?: Record<string, any>;

  @IsOptional()
  @IsObject()
  queryBuilderConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  pdfTemplateConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  excelTemplateConfig?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  supportsScheduling?: boolean;

  @IsOptional()
  @IsArray()
  defaultEmailRecipients?: string[];

  @IsOptional()
  @IsString()
  defaultEmailSubject?: string;

  @IsOptional()
  @IsString()
  defaultEmailBody?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
