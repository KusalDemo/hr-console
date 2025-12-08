import { WorkflowDefinition } from '../entities/workflow-definition.entity';

/**
 * Workflow Definition Response DTO
 */
export class WorkflowDefinitionResponseDto {
  id: number;
  workflowKey: string;
  workflowName: string;
  entityType: string;
  description: string | null;
  workflowDefinition: Record<string, any>;
  version: number;
  isDefault: boolean;
  isActive: boolean;
  organizationId: number | null;
  workflowMetadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;
}


