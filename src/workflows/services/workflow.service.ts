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
import { WorkflowStateMachineService } from './workflow-state-machine.service';
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
    private readonly stateMachineService: WorkflowStateMachineService,
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
   * Create initial approvals for a state
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

    const approvals: WorkflowApproval[] = [];

    for (let stepIndex = 0; stepIndex < stateDef.approvals.length; stepIndex++) {
      const approvalDef = stateDef.approvals[stepIndex];
      const approvalStep = stepIndex + 1;

      // Handle parallel approvals
      if (Array.isArray(approvalDef.approvers)) {
        for (let levelIndex = 0; levelIndex < approvalDef.approvers.length; levelIndex++) {
          const approverId = approvalDef.approvers[levelIndex];
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
      } else if (approvalDef.approver) {
        // Single approver
        const approval = this.workflowApprovalRepository.create({
          workflowInstanceId: instance.id,
          approvalStep,
          approvalLevel: 1,
          approverId: approvalDef.approver,
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

