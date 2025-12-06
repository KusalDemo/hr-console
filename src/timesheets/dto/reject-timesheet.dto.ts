import { IsString } from 'class-validator';

/**
 * Reject Timesheet DTO
 */
export class RejectTimesheetDto {
  @IsString()
  reason: string;
}

