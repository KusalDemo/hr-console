import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * Create Workflow Definition DTO
 */
export class CreateWorkflowDefinitionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  workflowKey: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  workflowName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  entityType: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  workflowDefinition: Record<string, any>;

  @IsOptional()
  @IsNumber()
  version?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsNumber()
  organizationId?: number;

  @IsOptional()
  @IsObject()
  workflowMetadata?: Record<string, any>;
}


