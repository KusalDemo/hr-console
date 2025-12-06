import { IsOptional, IsString } from 'class-validator';

/**
 * Approve Timesheet DTO
 */
export class ApproveTimesheetDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

