import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowsController } from './workflows.controller';
import { WorkflowService, WorkflowStateMachineService, ApprovalRoutingService } from './services';
import {
  WorkflowDefinitionRepository,
  WorkflowInstanceRepository,
  WorkflowTransitionRepository,
  WorkflowApprovalRepository,
  ApprovalDelegationRepository,
} from './repositories';
import {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowTransition,
  WorkflowApproval,
  ApprovalDelegation,
} from './entities';

/**
 * Workflows Module
 * 
 * Provides workflow engine for configurable approval workflows and business process automation.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowDefinition,
      WorkflowInstance,
      WorkflowTransition,
      WorkflowApproval,
      ApprovalDelegation,
    ]),
  ],
  controllers: [WorkflowsController],
  providers: [
    WorkflowService,
    WorkflowStateMachineService,
    ApprovalRoutingService,
    WorkflowDefinitionRepository,
    WorkflowInstanceRepository,
    WorkflowTransitionRepository,
    WorkflowApprovalRepository,
    ApprovalDelegationRepository,
  ],
  exports: [
    WorkflowService,
    WorkflowStateMachineService,
    ApprovalRoutingService,
    WorkflowDefinitionRepository,
    WorkflowInstanceRepository,
    ApprovalDelegationRepository,
  ],
})
export class WorkflowsModule {}


