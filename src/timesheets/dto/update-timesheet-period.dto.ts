import { PartialType } from '@nestjs/mapped-types';
import { CreateTimesheetPeriodDto } from './create-timesheet-period.dto';

/**
 * Update Timesheet Period DTO
 */
export class UpdateTimesheetPeriodDto extends PartialType(CreateTimesheetPeriodDto) {}

