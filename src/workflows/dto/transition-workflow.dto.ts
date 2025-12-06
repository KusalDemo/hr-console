import { IsString, IsOptional, IsObject } from 'class-validator';

/**
 * Transition Workflow DTO
 */
export class TransitionWorkflowDto {
  @IsString()
  transitionName: string;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsObject()
  transitionData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  updateData?: Record<string, any>;
}

