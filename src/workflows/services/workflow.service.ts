import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { WorkflowDefinitionRepository } from '../repositories/workflow-definition.repository';
import { WorkflowInstanceRepository } from '../repositories/workflow-instance.repository';
import { WorkflowTransitionRepository } from '../repositories/workflow-transition.repository';
import { WorkflowApprovalRepository } from '../repositories/workflow-approval.repository';
import { ApprovalDelegationRepository } from '../repositories/approval-delegation.repository';
import { ApprovalDelegation } from '../entities/approval-delegation.entity';
import { WorkflowStateMachineService } from './workflow-state-machine.service';
import { ApprovalRoutingService } from './approval-routing.service';
import {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStatus,
  WorkflowTransition,
  TriggerType,
  WorkflowApproval,
  ApprovalStatus,
} from '../entities';
import {
  CreateWorkflowDefinitionDto,
  UpdateWorkflowDefinitionDto,
  StartWorkflowDto,
  TransitionWorkflowDto,
  ApproveWorkflowDto,
  WorkflowDefinitionResponseDto,
  WorkflowInstanceResponseDto,
} from '../dto';

/**
 * Workflow Service
 * 
 * Manages workflow definitions and instances.
 * Handles state machine logic, transitions, approvals, escalations.
 */
@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly workflowDefinitionRepository: WorkflowDefinitionRepository,
    private readonly workflowInstanceRepository: WorkflowInstanceRepository,
    private readonly workflowTransitionRepository: WorkflowTransitionRepository,
    private readonly workflowApprovalRepository: WorkflowApprovalRepository,
    private readonly approvalDelegationRepository: ApprovalDelegationRepository,
    private readonly stateMachineService: WorkflowStateMachineService,
    private readonly approvalRoutingService: ApprovalRoutingService,
  ) {}

  /**
   * Create a new workflow definition
   */
  async createWorkflowDefinition(
    createDto: CreateWorkflowDefinitionDto,
    createdBy?: number,
  ): Promise<WorkflowDefinitionResponseDto> {
    // Check if workflow key already exists
    const exists = await this.workflowDefinitionRepository.workflowKeyExists(createDto.workflowKey);

    if (exists) {
      throw new ConflictException(`Workflow key '${createDto.workflowKey}' already exists`);
    }

    // Validate workflow definition JSON
    this.validateWorkflowDefinition(createDto.workflowDefinition);

    // Create workflow definition
    const workflowDefinition = this.workflowDefinitionRepository.create({
      ...createDto,
      isActive: true,
      version: createDto.version || 1,
      isDefault: createDto.isDefault || false,
      createdBy,
    });

    const saved = await this.workflowDefinitionRepository.save(workflowDefinition);

    this.logger.log(`Created workflow definition: ${saved.id} (${saved.workflowKey})`);

    return this.mapToDefinitionResponse(saved);
  }

  /**
   * Update a workflow definition
   */
  async updateWorkflowDefinition(
    id: number,
    updateDto: UpdateWorkflowDefinitionDto,
    updatedBy?: number,
  ): Promise<WorkflowDefinitionResponseDto> {
    const workflowDefinition = await this.workflowDefinitionRepository.findOne({
      where: { id },
    });

    if (!workflowDefinition) {
      throw new NotFoundException(`Workflow definition with ID ${id} not found`);
    }

    // Check workflow key uniqueness if changed
    if (updateDto.workflowKey && updateDto.workflowKey !== workflowDefinition.workflowKey) {
      const exists = await this.workflowDefinitionRepository.workflowKeyExists(
        updateDto.workflowKey,
        id,
      );

      if (exists) {
        throw new ConflictException(`Workflow key '${updateDto.workflowKey}' already exists`);
      }
    }

    // Validate workflow definition JSON if provided
    if (updateDto.workflowDefinition) {
      this.validateWorkflowDefinition(updateDto.workflowDefinition);
    }

    // Update workflow definition
    Object.assign(workflowDefinition, updateDto);
    workflowDefinition.updatedBy = updatedBy;

    const saved = await this.workflowDefinitionRepository.save(workflowDefinition);

    this.logger.log(`Updated workflow definition: ${saved.id}`);

    return this.mapToDefinitionResponse(saved);
  }

  /**
   * Get workflow definition by ID
   */
  async getWorkflowDefinition(id: number): Promise<WorkflowDefinitionResponseDto> {
    const workflowDefinition = await this.workflowDefinitionRepository.findOne({
      where: { id },
    });

    if (!workflowDefinition) {
      throw new NotFoundException(`Workflow definition with ID ${id} not found`);
    }

    return this.mapToDefinitionResponse(workflowDefinition);
  }

  /**
   * Get workflow definition by key
   */
  async getWorkflowDefinitionByKey(workflowKey: string): Promise<WorkflowDefinitionResponseDto> {
    const workflowDefinition = await this.workflowDefinitionRepository.findByKey(workflowKey);

    if (!workflowDefinition) {
      throw new NotFoundException(`Workflow definition with key '${workflowKey}' not found`);
    }

    return this.mapToDefinitionResponse(workflowDefinition);
  }

  /**
   * Get workflow definitions by entity type
   */
  async getWorkflowDefinitionsByEntityType(
    entityType: string,
  ): Promise<WorkflowDefinitionResponseDto[]> {
    const workflows = await this.workflowDefinitionRepository.findByEntityType(entityType);

    return workflows.map((w) => this.mapToDefinitionResponse(w));
  }

  /**
   * Start a workflow instance
   */
  async startWorkflow(
    startDto: StartWorkflowDto,
    createdBy?: number,
  ): Promise<WorkflowInstanceResponseDto> {
    // Get workflow definition
    const workflowDefinition = await this.workflowDefinitionRepository.findByKey(
      startDto.workflowKey,
    );

    if (!workflowDefinition) {
      throw new NotFoundException(`Workflow definition with key '${startDto.workflowKey}' not found`);
    }

    // Check if workflow already exists for this entity
    const existing = await this.workflowInstanceRepository.findByEntity(
      startDto.entityType,
      startDto.entityId,
    );

    if (existing) {
      throw new ConflictException('Active workflow already exists for this entity');
    }

    // Parse workflow definition
    const workflowDef = this.stateMachineService.parseWorkflowDefinition(
      workflowDefinition.workflowDefinition,
    );

    // Get initial state
    const initialState = this.stateMachineService.getInitialState(workflowDef);

    // Create workflow instance
    const instance = this.workflowInstanceRepository.create({
      workflowDefinitionId: workflowDefinition.id,
      entityType: startDto.entityType,
      entityId: startDto.entityId,
      currentState: initialState,
      status: WorkflowStatus.ACTIVE,
      workflowData: startDto.initialData || {},
      organizationId: startDto.organizationId,
      startedAt: new Date(),
      createdBy,
    });

    const saved = await this.workflowInstanceRepository.save(instance);

    // Create initial approvals if any
    await this.createInitialApprovals(saved, workflowDef, initialState);

    this.logger.log(
      `Workflow instance started: workflow=${startDto.workflowKey}, entity=${startDto.entityType}/${startDto.entityId}, state=${initialState}`,
    );

    return this.mapToInstanceResponse(saved, workflowDefinition);
  }

  /**
   * Transition workflow to a new state
   */
  async transitionWorkflow(
    instanceId: number,
    transitionDto: TransitionWorkflowDto,
    triggeredBy?: number,
  ): Promise<WorkflowInstanceResponseDto> {
    const instance = await this.workflowInstanceRepository.findById(instanceId, true);

    if (!instance) {
      throw new NotFoundException(`Workflow instance with ID ${instanceId} not found`);
    }

    if (instance.status !== WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Workflow is not active');
    }

    const workflowDefinition = instance.workflowDefinition;

    // Parse workflow definition
    const workflowDef = this.stateMachineService.parseWorkflowDefinition(
      workflowDefinition.workflowDefinition,
    );

    // Find transition
    const fromState = instance.currentState;
    const transition = this.stateMachineService.findTransition(
      workflowDef,
      fromState,
      transitionDto.transitionName,
    );

    if (!transition) {
      throw new BadRequestException(
        `Transition '${transitionDto.transitionName}' not found from state '${fromState}'`,
      );
    }

    // Check conditions
    if (!this.stateMachineService.evaluateConditions(transition.conditions || {}, instance)) {
      throw new BadRequestException('Transition conditions not met');
    }

    // Get target state
    const toState = transition.toState;
    if (!toState) {
      throw new BadRequestException('Target state not specified in transition');
    }

    // Verify target state exists
    if (!this.stateMachineService.stateExists(workflowDef, toState)) {
      throw new BadRequestException(`Target state does not exist: ${toState}`);
    }

    // Record transition
    const transitionRecord = this.workflowTransitionRepository.create({
      workflowInstanceId: instance.id,
      fromState,
      toState,
      transitionName: transitionDto.transitionName,
      triggeredBy,
      triggerType: TriggerType.MANUAL,
      comments: transitionDto.comments,
      transitionData: transitionDto.transitionData || {},
    });

    await this.workflowTransitionRepository.save(transitionRecord);

    // Update instance state
    instance.currentState = toState;
    instance.updatedBy = triggeredBy;

    // Check if this is a final state
    if (this.stateMachineService.isFinalState(workflowDef, toState)) {
      instance.status = WorkflowStatus.COMPLETED;
      instance.completedAt = new Date();
      instance.completedBy = triggeredBy;
    }

    // Update workflow data if provided
    if (transitionDto.updateData) {
      instance.workflowData = {
        ...(instance.workflowData || {}),
        ...transitionDto.updateData,
      };
    }

    const saved = await this.workflowInstanceRepository.save(instance);

    // Create approvals for new state if any
    await this.createInitialApprovals(saved, workflowDef, toState);

    this.logger.log(
      `Workflow transitioned: instance=${instanceId}, ${fromState} -> ${toState}`,
    );

    return this.mapToInstanceResponse(saved, workflowDefinition);
  }

  /**
   * Get workflow instance by ID
   */
  async getWorkflowInstance(id: number): Promise<WorkflowInstanceResponseDto> {
    const instance = await this.workflowInstanceRepository.findById(id, true);

    if (!instance) {
      throw new NotFoundException(`Workflow instance with ID ${id} not found`);
    }

    return this.mapToInstanceResponse(instance, instance.workflowDefinition);
  }

  /**
   * Get workflow instance by entity
   */
  async getWorkflowInstanceByEntity(
    entityType: string,
    entityId: number,
  ): Promise<WorkflowInstanceResponseDto | null> {
    const instance = await this.workflowInstanceRepository.findByEntity(entityType, entityId, true);

    if (!instance) {
      return null;
    }

    return this.mapToInstanceResponse(instance, instance.workflowDefinition);
  }

  /**
   * Cancel workflow instance
   */
  async cancelWorkflowInstance(
    instanceId: number,
    reason: string,
    cancelledBy?: number,
  ): Promise<void> {
    const instance = await this.workflowInstanceRepository.findById(instanceId);

    if (!instance) {
      throw new NotFoundException(`Workflow instance with ID ${instanceId} not found`);
    }

    if (instance.status !== WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Only active workflows can be cancelled');
    }

    instance.status = WorkflowStatus.CANCELLED;
    instance.completedAt = new Date();
    instance.completedBy = cancelledBy;
    instance.completionReason = reason;
    instance.updatedBy = cancelledBy;

    await this.workflowInstanceRepository.save(instance);

    this.logger.log(`Workflow cancelled: instance=${instanceId}`);
  }

  /**
   * Process approval with delegation support
   */
  async processApproval(
    approvalId: number,
    approve: boolean,
    approverId: number,
    comments?: string,
  ): Promise<WorkflowApproval> {
    const approval = await this.workflowApprovalRepository.findById(approvalId);

    if (!approval) {
      throw new NotFoundException(`Approval with ID ${approvalId} not found`);
    }

    const instance = await this.workflowInstanceRepository.findById(approval.workflowInstanceId);

    if (!instance) {
      throw new NotFoundException(`Workflow instance not found`);
    }

    if (instance.status !== WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Workflow is not active');
    }

    // Verify approver (check original approver or delegate)
    if (
      approval.approverId !== approverId &&
      (approval.delegatedTo === null || approval.delegatedTo !== approverId)
    ) {
      throw new BadRequestException('User is not authorized to approve this step');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Approval is not pending');
    }

    // Update approval
    if (approve) {
      approval.status = ApprovalStatus.APPROVED;
      approval.approvedAt = new Date();
    } else {
      approval.status = ApprovalStatus.REJECTED;
      approval.rejectedAt = new Date();
      // Reject workflow
      instance.status = WorkflowStatus.REJECTED;
      instance.completedAt = new Date();
      instance.completedBy = approverId;
      instance.completionReason = comments;
      await this.workflowInstanceRepository.save(instance);
    }

    approval.comments = comments || null;
    await this.workflowApprovalRepository.save(approval);

    // Check if all required approvals are done
    if (approve) {
      await this.checkAndProceedWorkflow(instance);
    }

    this.logger.log(
      `Approval processed: approval=${approvalId}, approve=${approve}, workflow=${instance.id}`,
    );

    return approval;
  }

  /**
   * Check if workflow can proceed and transition if needed
   */
  private async checkAndProceedWorkflow(instance: WorkflowInstance): Promise<void> {
    // Get all pending approvals for this instance
    const pendingApprovals = await this.workflowApprovalRepository.findPendingByInstance(
      instance.id,
    );

    // Check if all required approvals are done
    const requiredApprovals = pendingApprovals.filter((a) => a.isRequired);
    const approvedRequired = requiredApprovals.filter(
      (a) => a.status === ApprovalStatus.APPROVED,
    );

    if (approvedRequired.length === requiredApprovals.length) {
      // All required approvals done, transition workflow
      const workflowDefinition = instance.workflowDefinition;
      const workflowDef = this.stateMachineService.parseWorkflowDefinition(
        workflowDefinition.workflowDefinition,
      );

      // Find next state (could be enhanced with workflow definition logic)
      // For now, we'll mark as completed if in final state
      if (this.stateMachineService.isFinalState(workflowDef, instance.currentState)) {
        instance.status = WorkflowStatus.COMPLETED;
        instance.completedAt = new Date();
        await this.workflowInstanceRepository.save(instance);
      }
    }
  }

  /**
   * Create initial approvals for a state
   * Enhanced with approval routing and delegation support
   */
  private async createInitialApprovals(
    instance: WorkflowInstance,
    workflowDef: Record<string, any>,
    stateName: string,
  ): Promise<void> {
    const stateDef = this.stateMachineService.getStateDefinition(workflowDef, stateName);

    if (!stateDef || !stateDef.approvals || !Array.isArray(stateDef.approvals)) {
      return;
    }

    // Check for auto-approval
    const autoApprovalCheck = await this.approvalRoutingService.checkAutoApproval(
      instance.workflowDefinition.workflowKey,
      instance.entityType,
      instance.workflowData,
      stateDef.autoApprovalRules,
    );

    if (autoApprovalCheck.shouldAutoApprove) {
      this.logger.log(
        `Auto-approving workflow instance ${instance.id}: ${autoApprovalCheck.reason}`,
      );
      // Auto-approve and transition
      instance.currentState = stateDef.autoApprovalTargetState || stateName;
      await this.workflowInstanceRepository.save(instance);
      return;
    }

    const approvals: WorkflowApproval[] = [];

    for (let stepIndex = 0; stepIndex < stateDef.approvals.length; stepIndex++) {
      const approvalDef = stateDef.approvals[stepIndex];
      const approvalStep = stepIndex + 1;

      // Determine approvers using routing service if routing rules are provided
      let approverIds: number[] = [];

      if (approvalDef.routingRules) {
        // Use routing service to determine approvers
        approverIds = await this.approvalRoutingService.determineApprovalChain(
          instance.workflowData?.employeeId || 0,
          instance.workflowDefinition.workflowKey,
          instance.entityType,
          approvalDef.routingRules,
          instance.workflowData,
        );
      } else if (Array.isArray(approvalDef.approvers)) {
        // Use provided approvers
        approverIds = approvalDef.approvers;
      } else if (approvalDef.approver) {
        // Single approver
        approverIds = [approvalDef.approver];
      }

      // Resolve delegations for each approver
      const resolvedApproverIds = await Promise.all(
        approverIds.map((approverId) =>
          this.approvalRoutingService.resolveApprover(
            approverId,
            instance.workflowDefinition.workflowKey,
            instance.entityType,
            instance.workflowData,
          ),
        ),
      );

      // Handle parallel approvals
      if (approvalDef.parallel !== false && resolvedApproverIds.length > 1) {
        // Parallel: all approvers at same level
        for (let levelIndex = 0; levelIndex < resolvedApproverIds.length; levelIndex++) {
          const approverId = resolvedApproverIds[levelIndex];
          const approvalLevel = levelIndex + 1;

          const approval = this.workflowApprovalRepository.create({
            workflowInstanceId: instance.id,
            approvalStep,
            approvalLevel,
            approverId,
            status: ApprovalStatus.PENDING,
            isRequired: approvalDef.required !== false,
            dueDate: approvalDef.dueDate
              ? new Date(approvalDef.dueDate)
              : approvalDef.dueInDays
                ? new Date(Date.now() + approvalDef.dueInDays * 24 * 60 * 60 * 1000)
                : null,
          });

          approvals.push(approval);
        }
      } else {
        // Sequential: approvers in sequence
        for (let levelIndex = 0; levelIndex < resolvedApproverIds.length; levelIndex++) {
          const approverId = resolvedApproverIds[levelIndex];
          const approvalLevel = levelIndex + 1;

          const approval = this.workflowApprovalRepository.create({
            workflowInstanceId: instance.id,
            approvalStep,
            approvalLevel,
            approverId,
            status: ApprovalStatus.PENDING,
            isRequired: approvalDef.required !== false,
            dueDate: approvalDef.dueDate
              ? new Date(approvalDef.dueDate)
              : approvalDef.dueInDays
                ? new Date(Date.now() + approvalDef.dueInDays * 24 * 60 * 60 * 1000)
                : null,
          });

          approvals.push(approval);
        }
      }
    }

    if (approvals.length > 0) {
      await this.workflowApprovalRepository.save(approvals);
    }
  }

  /**
   * Validate workflow definition structure
   */
  private validateWorkflowDefinition(workflowDef: Record<string, any>): void {
    if (!workflowDef.states || !Array.isArray(workflowDef.states) || workflowDef.states.length === 0) {
      throw new BadRequestException('Workflow definition must have at least one state');
    }

    // Validate states have names
    for (const state of workflowDef.states) {
      if (!state.name) {
        throw new BadRequestException('All states must have a name');
      }
    }

    // Validate transitions reference valid states
    if (workflowDef.transitions && Array.isArray(workflowDef.transitions)) {
      for (const transition of workflowDef.transitions) {
        if (!transition.fromState || !transition.toState) {
          throw new BadRequestException('All transitions must have fromState and toState');
        }

        if (!this.stateMachineService.stateExists(workflowDef, transition.fromState)) {
          throw new BadRequestException(`Transition references invalid fromState: ${transition.fromState}`);
        }

        if (!this.stateMachineService.stateExists(workflowDef, transition.toState)) {
          throw new BadRequestException(`Transition references invalid toState: ${transition.toState}`);
      }
    }
  }

  // ========== Delegation Methods ==========

  /**
   * Create approval delegation
   */
  async createDelegation(createDto: any, createdBy?: number): Promise<ApprovalDelegation> {
    const delegation = this.approvalDelegationRepository.create({
      ...createDto,
      effectiveStartDate: new Date(createDto.effectiveStartDate),
      effectiveEndDate: createDto.effectiveEndDate ? new Date(createDto.effectiveEndDate) : null,
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
      createdBy,
    });

    const saved = await this.approvalDelegationRepository.save(delegation);

    this.logger.log(
      `Created approval delegation: ${saved.id} (delegator: ${saved.delegatorId} -> delegate: ${saved.delegateId})`,
    );

    return saved;
  }

  /**
   * Get delegations for delegator
   */
  async getDelegationsForDelegator(
    delegatorId: number,
    workflowKey?: string,
    entityType?: string,
  ): Promise<ApprovalDelegation[]> {
    return this.approvalDelegationRepository.findActiveDelegations(
      delegatorId,
      workflowKey,
      entityType,
    );
  }

  /**
   * Get delegations for delegate
   */
  async getDelegationsForDelegate(delegateId: number): Promise<ApprovalDelegation[]> {
    return this.approvalDelegationRepository.findDelegationsForDelegate(delegateId);
  }

  /**
   * Remove delegation
   */
  async removeDelegation(delegationId: number, updatedBy?: number): Promise<void> {
    const delegation = await this.approvalDelegationRepository.findById(delegationId);

    if (!delegation) {
      throw new NotFoundException(`Delegation with ID ${delegationId} not found`);
    }

    delegation.isActive = false;
    delegation.updatedBy = updatedBy;

    await this.approvalDelegationRepository.save(delegation);

    this.logger.log(`Removed approval delegation: ${delegationId}`);
  }
}

  /**
   * Map entity to response DTO
   */
  private mapToDefinitionResponse(workflow: WorkflowDefinition): WorkflowDefinitionResponseDto {
    return {
      id: workflow.id,
      workflowKey: workflow.workflowKey,
      workflowName: workflow.workflowName,
      entityType: workflow.entityType,
      description: workflow.description,
      workflowDefinition: workflow.workflowDefinition,
      version: workflow.version,
      isDefault: workflow.isDefault,
      isActive: workflow.isActive,
      organizationId: workflow.organizationId,
      workflowMetadata: workflow.workflowMetadata,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      createdBy: workflow.createdBy,
      updatedBy: workflow.updatedBy,
    };
  }

  /**
   * Map instance to response DTO
   */
  private mapToInstanceResponse(
    instance: WorkflowInstance,
    definition: WorkflowDefinition,
  ): WorkflowInstanceResponseDto {
    return {
      id: instance.id,
      workflowDefinitionId: instance.workflowDefinitionId,
      workflowDefinition: this.mapToDefinitionResponse(definition),
      entityType: instance.entityType,
      entityId: instance.entityId,
      currentState: instance.currentState,
      status: instance.status,
      workflowData: instance.workflowData,
      organizationId: instance.organizationId,
      startedAt: instance.startedAt,
      completedAt: instance.completedAt,
      completedBy: instance.completedBy,
      completionReason: instance.completionReason,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
      createdBy: instance.createdBy,
      updatedBy: instance.updatedBy,
    };
  }
}


