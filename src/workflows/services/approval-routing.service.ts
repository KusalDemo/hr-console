import { Injectable, Logger } from '@nestjs/common';
import { ApprovalDelegationRepository } from '../repositories/approval-delegation.repository';
import { ApprovalDelegation } from '../entities/approval-delegation.entity';

/**
 * Approval Routing Service
 *
 * Handles dynamic approval chain routing with:
 * - Approval routing based on department, amount, duration
 * - Delegation resolution
 * - Escalation policies
 * - Auto-approval thresholds
 * - Parallel vs sequential approval determination
 */
@Injectable()
export class ApprovalRoutingService {
  private readonly logger = new Logger(ApprovalRoutingService.name);

  constructor(private readonly delegationRepository: ApprovalDelegationRepository) {}

  /**
   * Resolve approver considering delegations
   */
  async resolveApprover(
    originalApproverId: number,
    workflowKey: string,
    entityType: string,
    context?: Record<string, any>,
  ): Promise<number> {
    // Check for active delegations
    const delegations = await this.delegationRepository.findActiveDelegations(
      originalApproverId,
      workflowKey,
      entityType,
    );

    if (delegations.length === 0) {
      return originalApproverId;
    }

    // Find the most specific delegation (workflow-specific > entity-specific > general)
    const specificDelegation =
      delegations.find((d) => d.workflowKey === workflowKey && d.entityType === entityType) ||
      delegations.find((d) => d.workflowKey === workflowKey) ||
      delegations.find((d) => d.entityType === entityType) ||
      delegations[0];

    // Check if delegation scope applies to context
    if (specificDelegation.delegationScope) {
      if (!this.delegationScopeApplies(specificDelegation.delegationScope, context)) {
        return originalApproverId;
      }
    }

    this.logger.debug(
      `Delegation resolved: ${originalApproverId} -> ${specificDelegation.delegateId} for workflow ${workflowKey}`,
    );

    return specificDelegation.delegateId;
  }

  /**
   * Determine approval chain based on routing rules
   */
  async determineApprovalChain(
    employeeId: number,
    workflowKey: string,
    entityType: string,
    routingRules: {
      departmentBased?: boolean;
      amountBased?: boolean;
      durationBased?: boolean;
      amountThresholds?: Array<{ threshold: number; approverId: number }>;
      durationThresholds?: Array<{ threshold: number; approverId: number }>;
      departmentApprovers?: Record<number, number>; // departmentId -> approverId
      defaultApprovers?: number[];
    },
    context?: Record<string, any>,
  ): Promise<number[]> {
    const approvers: number[] = [];

    // Department-based routing
    if (routingRules.departmentBased && context?.departmentId) {
      const departmentApprover = routingRules.departmentApprovers?.[context.departmentId];
      if (departmentApprover) {
        approvers.push(departmentApprover);
        this.logger.debug(`Department-based approver added: ${departmentApprover}`);
      }
    }

    // Amount-based routing
    if (routingRules.amountBased && context?.amount) {
      const amountThresholds = routingRules.amountThresholds || [];
      // Sort thresholds descending to find first matching threshold
      const sortedThresholds = [...amountThresholds].sort((a, b) => b.threshold - a.threshold);
      const matchingThreshold = sortedThresholds.find((t) => context.amount >= t.threshold);
      if (matchingThreshold) {
        approvers.push(matchingThreshold.approverId);
        this.logger.debug(
          `Amount-based approver added: ${matchingThreshold.approverId} (threshold: ${matchingThreshold.threshold})`,
        );
      }
    }

    // Duration-based routing
    if (routingRules.durationBased && context?.duration) {
      const durationThresholds = routingRules.durationThresholds || [];
      const sortedThresholds = [...durationThresholds].sort((a, b) => b.threshold - a.threshold);
      const matchingThreshold = sortedThresholds.find((t) => context.duration >= t.threshold);
      if (matchingThreshold) {
        approvers.push(matchingThreshold.approverId);
        this.logger.debug(
          `Duration-based approver added: ${matchingThreshold.approverId} (threshold: ${matchingThreshold.threshold})`,
        );
      }
    }

    // Default approvers if no routing matched
    if (approvers.length === 0 && routingRules.defaultApprovers) {
      approvers.push(...routingRules.defaultApprovers);
      this.logger.debug(`Default approvers added: ${routingRules.defaultApprovers.join(', ')}`);
    }

    // Resolve delegations for all approvers
    const resolvedApprovers = await Promise.all(
      approvers.map((approverId) =>
        this.resolveApprover(approverId, workflowKey, entityType, context),
      ),
    );

    // Remove duplicates while preserving order
    const uniqueApprovers = Array.from(new Set(resolvedApprovers));

    return uniqueApprovers;
  }

  /**
   * Check if auto-approval should apply
   */
  async checkAutoApproval(
    workflowKey: string,
    entityType: string,
    context?: Record<string, any>,
    autoApprovalRules?: {
      amountThreshold?: number;
      durationThreshold?: number;
      conditions?: Record<string, any>;
    },
  ): Promise<{ shouldAutoApprove: boolean; reason?: string }> {
    if (!autoApprovalRules) {
      return { shouldAutoApprove: false };
    }

    // Check amount threshold
    if (autoApprovalRules.amountThreshold && context?.amount) {
      if (context.amount <= autoApprovalRules.amountThreshold) {
        return {
          shouldAutoApprove: true,
          reason: `Amount ${context.amount} is below auto-approval threshold ${autoApprovalRules.amountThreshold}`,
        };
      }
    }

    // Check duration threshold
    if (autoApprovalRules.durationThreshold && context?.duration) {
      if (context.duration <= autoApprovalRules.durationThreshold) {
        return {
          shouldAutoApprove: true,
          reason: `Duration ${context.duration} is below auto-approval threshold ${autoApprovalRules.durationThreshold}`,
        };
      }
    }

    // Check custom conditions
    if (autoApprovalRules.conditions) {
      const allConditionsMet = Object.entries(autoApprovalRules.conditions).every(
        ([key, value]) => context?.[key] === value,
      );
      if (allConditionsMet) {
        return {
          shouldAutoApprove: true,
          reason: 'All auto-approval conditions met',
        };
      }
    }

    return { shouldAutoApprove: false };
  }

  /**
   * Get escalation approver if timeout occurs
   */
  async getEscalationApprover(
    originalApproverId: number,
    workflowKey: string,
    escalationRules?: {
      escalationTo?: number;
      escalationAfterHours?: number;
      escalationPolicy?: string;
    },
  ): Promise<number | null> {
    if (!escalationRules || !escalationRules.escalationTo) {
      return null;
    }

    // Resolve delegation for escalation approver
    return this.resolveApprover(escalationRules.escalationTo, workflowKey, 'escalation', {});
  }

  /**
   * Check if delegation scope applies to context
   */
  private delegationScopeApplies(
    scope: Record<string, any>,
    context?: Record<string, any>,
  ): boolean {
    if (!context) {
      return true; // No context means scope applies
    }

    // Check department scope
    if (scope.departments && Array.isArray(scope.departments)) {
      if (!context.departmentId || !scope.departments.includes(context.departmentId)) {
        return false;
      }
    }

    // Check amount threshold
    if (scope.amountThreshold !== undefined && context.amount !== undefined) {
      if (context.amount > scope.amountThreshold) {
        return false;
      }
    }

    // Check duration threshold
    if (scope.durationThreshold !== undefined && context.duration !== undefined) {
      if (context.duration > scope.durationThreshold) {
        return false;
      }
    }

    // Check approval levels
    if (scope.approvalLevels && Array.isArray(scope.approvalLevels)) {
      if (!context.approvalLevel || !scope.approvalLevels.includes(context.approvalLevel)) {
        return false;
      }
    }

    return true;
  }
}
