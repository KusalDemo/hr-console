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
} from 'class-validator';
import { ImportFormat } from '../entities/import-job.entity';

/**
 * Create Import Job DTO
 */
export class CreateImportJobDto {
  @IsOptional()
  @IsNumber()
  templateId?: number;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  entityType: string;

  @IsOptional()
  @IsEnum(ImportFormat)
  importFormat?: ImportFormat;

  @IsNumber()
  organizationId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  fileName: string;

  @IsNumber()
  @Min(0)
  fileSize: number;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  filePath: string;

  @IsOptional()
  @IsBoolean()
  rollbackOnFailure?: boolean;

  @IsOptional()
  @IsBoolean()
  isIncremental?: boolean;

  @IsOptional()
  @IsString()
  duplicateStrategy?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  batchSize?: number;

  @IsOptional()
  @IsObject()
  importConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
