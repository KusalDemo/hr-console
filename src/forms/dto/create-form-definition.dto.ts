import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FormStatus, FormAccessType } from '../entities/form-definition.entity';

/**
 * Create Form Definition DTO
 */
export class CreateFormDefinitionDto {
  @IsString()
  formName: string;

  @IsOptional()
  @IsString()
  formDescription?: string;

  @IsNumber()
  @Type(() => Number)
  organizationId: number;

  @IsOptional()
  @IsEnum(FormStatus)
  status?: FormStatus;

  @IsOptional()
  @IsEnum(FormAccessType)
  accessType?: FormAccessType;

  @IsObject()
  formSchema: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  templateId?: number;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

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
