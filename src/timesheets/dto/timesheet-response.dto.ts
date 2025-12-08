import { TimesheetStatus } from '../entities/timesheet.entity';
import { TimesheetPeriodResponseDto } from './timesheet-period-response.dto';

/**
 * Timesheet Response DTO
 */
export class TimesheetResponseDto {
  id: number;
  employeeId: number;
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  periodId: number;
  period?: TimesheetPeriodResponseDto;
  periodStartDate: Date;
  periodEndDate: Date;
  periodNumber: number | null;
  status: TimesheetStatus;
  totalHours: number;
  totalBillableHours: number;
  totalBillingAmount: number;
  totalCostAmount: number;
  organizationId: number | null;
  submittedAt: Date | null;
  submittedBy: number | null;
  approvedBy: number | null;
  approvedAt: Date | null;
  rejectedBy: number | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  isLocked: boolean;
  lockReason: string | null;
  lockedAt: Date | null;
  lockedBy: number | null;
  notes: string | null;
  workflowInstanceId: number | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;
}


