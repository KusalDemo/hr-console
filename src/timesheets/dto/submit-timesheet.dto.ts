import { IsOptional, IsString } from 'class-validator';

/**
 * Submit Timesheet DTO
 */
export class SubmitTimesheetDto {
  @IsOptional()
  @IsString()
  workflowKey?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}


