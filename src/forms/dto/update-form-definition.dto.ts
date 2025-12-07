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
import { FormStatus, FormAccessType } from '../entities/form-definition.entity';

/**
 * Update Form Definition DTO
 */
export class UpdateFormDefinitionDto {
  @IsOptional()
  @IsString()
  formName?: string;

  @IsOptional()
  @IsString()
  formDescription?: string;

  @IsOptional()
  @IsEnum(FormStatus)
  status?: FormStatus;

  @IsOptional()
  @IsEnum(FormAccessType)
  accessType?: FormAccessType;

  @IsOptional()
  @IsObject()
  formSchema?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAnonymous?: boolean;

  @IsOptional()
  @IsBoolean()
  allowMultipleSubmissions?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxSubmissionsPerUser?: number;

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
  @IsNumber()
  @Type(() => Number)
  workflowId?: number;

  @IsOptional()
  @IsObject()
  notificationConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  formSettings?: Record<string, any>;

  @IsOptional()
  @IsObject()
  formMetadata?: Record<string, any>;
}
