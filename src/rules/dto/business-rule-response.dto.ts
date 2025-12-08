import {
  RuleType,
  RuleTriggerType,
  TenantScope,
  ExecutionMode,
} from '../entities/business-rule.entity';

/**
 * Business Rule Response DTO
 */
export class BusinessRuleResponseDto {
  id: number;
  ruleKey: string;
  ruleName: string;
  ruleType: RuleType;
  entityType: string | null;
  triggerType: RuleTriggerType;
  triggerEvents: string[] | null;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  priority: number;
  isActive: boolean;
  activationDate: Date | null;
  expirationDate: Date | null;
  organizationId: number | null;
  tenantScope: TenantScope;
  executionMode: ExecutionMode;
  stopOnMatch: boolean;
  description: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;
}


