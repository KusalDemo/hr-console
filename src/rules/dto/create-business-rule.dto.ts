import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import {
  RuleType,
  RuleTriggerType,
  TenantScope,
  ExecutionMode,
} from '../entities/business-rule.entity';

/**
 * Create Business Rule DTO
 */
export class CreateBusinessRuleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  ruleKey: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  ruleName: string;

  @IsEnum(RuleType)
  ruleType: RuleType;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  entityType?: string;

  @IsEnum(RuleTriggerType)
  triggerType: RuleTriggerType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  triggerEvents?: string[];

  @IsObject()
  conditions: Record<string, any>;

  @IsObject()
  actions: Record<string, any>;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  activationDate?: Date;

  @IsOptional()
  expirationDate?: Date;

  @IsOptional()
  @IsNumber()
  organizationId?: number;

  @IsOptional()
  @IsEnum(TenantScope)
  tenantScope?: TenantScope;

  @IsOptional()
  @IsEnum(ExecutionMode)
  executionMode?: ExecutionMode;

  @IsOptional()
  @IsBoolean()
  stopOnMatch?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

