import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkflowDefinitionDto } from './create-workflow-definition.dto';

/**
 * Update Workflow Definition DTO
 */
export class UpdateWorkflowDefinitionDto extends PartialType(CreateWorkflowDefinitionDto) {}

