import { IsOptional, IsString, IsBoolean } from 'class-validator';

/**
 * Approve Workflow DTO
 */
export class ApproveWorkflowDto {
  @IsOptional()
  @IsBoolean()
  approved?: boolean;

  @IsOptional()
  @IsString()
  comments?: string;
}

