import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  IsArray,
  IsEnum,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ExportFormat, ExportDeliveryMethod } from '../entities/export-job.entity';

/**
 * Create Export Job DTO
 */
export class CreateExportJobDto {
  @IsOptional()
  @IsNumber()
  templateId?: number;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  entityType: string;

  @IsOptional()
  @IsEnum(ExportFormat)
  exportFormat?: ExportFormat;

  @IsNumber()
  organizationId: number;

  @IsOptional()
  @IsArray()
  fieldSelection?: string[];

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @IsOptional()
  @IsObject()
  sorting?: Record<string, any>;

  @IsOptional()
  @IsObject()
  exportQuery?: Record<string, any>;

  @IsOptional()
  @IsEnum(ExportDeliveryMethod)
  deliveryMethod?: ExportDeliveryMethod;

  @IsOptional()
  @IsArray()
  emailRecipients?: string[];

  @IsOptional()
  @IsString()
  emailSubject?: string;

  @IsOptional()
  @IsString()
  emailBody?: string;

  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  scheduleRecurrence?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
