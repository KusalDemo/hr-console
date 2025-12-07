import { WorkflowStatus } from '../entities/workflow-instance.entity';
import { WorkflowDefinitionResponseDto } from './workflow-definition-response.dto';

/**
 * Workflow Instance Response DTO
 */
export class WorkflowInstanceResponseDto {
  id: number;
  workflowDefinitionId: number;
  workflowDefinition?: WorkflowDefinitionResponseDto;
  entityType: string;
  entityId: number;
  currentState: string;
  status: WorkflowStatus;
  workflowData: Record<string, any> | null;
  organizationId: number | null;
  startedAt: Date;
  completedAt: Date | null;
  completedBy: number | null;
  completionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;
}

