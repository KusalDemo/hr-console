import { PeriodType } from '../entities/timesheet-period.entity';

/**
 * Timesheet Period Response DTO
 */
export class TimesheetPeriodResponseDto {
  id: number;
  periodKey: string;
  periodName: string;
  periodType: PeriodType;
  startDate: Date;
  daysInPeriod: number;
  isActive: boolean;
  description: string | null;
  organizationId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

