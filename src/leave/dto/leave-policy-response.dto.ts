import { LeavePolicy } from '../entities/leave-policy.entity';

/**
 * Leave Policy Response DTO
 */
export class LeavePolicyResponseDto {
  id: number;
  policyKey: string | null;
  policyName: string;
  description: string | null;
  effectiveStartDate: Date;
  effectiveEndDate: Date | null;
  active: boolean;
  isTemplate: boolean;
  templateCategory: string | null;
  parentPolicyId: number | null;
  probationaryPeriodDays: number | null;
  waitingPeriodDays: number | null;
  waitingPeriodType: string | null;
  accrualMethod: string | null;
  accrualFrequency: string | null;
  accrualCustomFormula: string | null;
  accrualStartDate: Date | null;
  accrualCalculationBasis: string | null;
  allowCarryOver: boolean;
  carryOverPercentage: number | null;
  carryOverMaxDays: number | null;
  carryOverExpiryDays: number | null;
  carryOverExpiryDate: Date | null;
  allowNegativeBalance: boolean;
  maxNegativeBalanceDays: number | null;
  prorateOnHire: boolean;
  prorateOnTermination: boolean;
  prorationMethod: string | null;
  policyMetadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  static fromEntity(policy: LeavePolicy): LeavePolicyResponseDto {
    return {
      id: policy.id,
      policyKey: policy.policyKey,
      policyName: policy.policyName,
      description: policy.description,
      effectiveStartDate: policy.effectiveStartDate,
      effectiveEndDate: policy.effectiveEndDate,
      active: policy.active,
      isTemplate: policy.isTemplate,
      templateCategory: policy.templateCategory,
      parentPolicyId: policy.parentPolicyId,
      probationaryPeriodDays: policy.probationaryPeriodDays,
      waitingPeriodDays: policy.waitingPeriodDays,
      waitingPeriodType: policy.waitingPeriodType,
      accrualMethod: policy.accrualMethod,
      accrualFrequency: policy.accrualFrequency,
      accrualCustomFormula: policy.accrualCustomFormula,
      accrualStartDate: policy.accrualStartDate,
      accrualCalculationBasis: policy.accrualCalculationBasis,
      allowCarryOver: policy.allowCarryOver,
      carryOverPercentage: policy.carryOverPercentage,
      carryOverMaxDays: policy.carryOverMaxDays,
      carryOverExpiryDays: policy.carryOverExpiryDays,
      carryOverExpiryDate: policy.carryOverExpiryDate,
      allowNegativeBalance: policy.allowNegativeBalance,
      maxNegativeBalanceDays: policy.maxNegativeBalanceDays,
      prorateOnHire: policy.prorateOnHire,
      prorateOnTermination: policy.prorateOnTermination,
      prorationMethod: policy.prorationMethod,
      policyMetadata: policy.policyMetadata,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
      createdBy: policy.createdBy,
      updatedBy: policy.updatedBy,
    };
  }
}
