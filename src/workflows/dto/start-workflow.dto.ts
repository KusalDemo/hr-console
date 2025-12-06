import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Start Workflow DTO
 */
export class StartWorkflowDto {
  @IsString()
  workflowKey: string;

  @IsString()
  entityType: string;

  @IsNumber()
  @Type(() => Number)
  entityId: number;

  @IsOptional()
  @IsObject()
  initialData?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organizationId?: number;
}

