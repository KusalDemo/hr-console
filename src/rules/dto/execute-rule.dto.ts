import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Execute Rule DTO
 */
export class ExecuteRuleDto {
  @IsString()
  entityType: string;

  @IsNumber()
  @Type(() => Number)
  entityId: number;

  @IsString()
  triggerEvent: string;

  @IsObject()
  entityData: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organizationId?: number;
}

