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
 * Update Report Definition DTO
 */
export class UpdateReportDefinitionDto {
  @IsOptional()
  @IsString()
  reportName?: string;

  @IsOptional()
  @IsString()
  reportDescription?: string;

  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @IsObject()
  dataSourceConfig?: Record<string, any>;

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
  @IsBoolean()
  isActive?: boolean;

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
