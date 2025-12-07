import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create Custom Field Value DTO
 */
export class CreateCustomFieldValueDto {
  @IsString()
  entityType: string;

  @IsNumber()
  @Type(() => Number)
  entityId: number;

  @IsNumber()
  @Type(() => Number)
  fieldDefinitionId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organizationId?: number;

  @IsOptional()
  @IsString()
  textValue?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  numberValue?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  decimalValue?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  booleanValue?: boolean;

  @IsOptional()
  @IsDateString()
  dateValue?: string;

  @IsOptional()
  @IsDateString()
  datetimeValue?: string;

  @IsOptional()
  jsonValue?: any;

  @IsOptional()
  @IsString()
  fileValue?: string;

  @IsOptional()
  valueMetadata?: Record<string, any>;
}
