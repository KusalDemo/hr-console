import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowsController } from './workflows.controller';
import { WorkflowService, WorkflowStateMachineService } from './services';
import {
  WorkflowDefinitionRepository,
  WorkflowInstanceRepository,
  WorkflowTransitionRepository,
  WorkflowApprovalRepository,
} from './repositories';
import {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowTransition,
  WorkflowApproval,
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
    ]),
  ],
  controllers: [WorkflowsController],
  providers: [
    WorkflowService,
    WorkflowStateMachineService,
    WorkflowDefinitionRepository,
    WorkflowInstanceRepository,
    WorkflowTransitionRepository,
    WorkflowApprovalRepository,
  ],
  exports: [
    WorkflowService,
    WorkflowStateMachineService,
    WorkflowDefinitionRepository,
    WorkflowInstanceRepository,
  ],
})
export class WorkflowsModule {}


