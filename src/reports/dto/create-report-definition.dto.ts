import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ReportType,
  ReportOutputFormat,
  ReportStatus,
} from '../entities/report-definition.entity';

/**
 * Create Report Definition DTO
 */
export class CreateReportDefinitionDto {
  @IsString()
  reportName: string;

  @IsOptional()
  @IsString()
  reportDescription?: string;

  @IsNumber()
  @Type(() => Number)
  organizationId: number;

  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsObject()
  dataSourceConfig: Record<string, any>;

  @IsOptional()
  @IsArray()
  fieldSelections?: Record<string, any>[];

  @IsOptional()
  @IsObject()
  filterConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  groupingConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  sortingConfig?: Record<string, any>;

  @IsOptional()
  @IsEnum(ReportOutputFormat)
  defaultOutputFormat?: ReportOutputFormat;

  @IsOptional()
  @IsObject()
  reportTemplate?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  templateId?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  permissionsConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  emailConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  reportMetadata?: Record<string, any>;
}
