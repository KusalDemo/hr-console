/**
 * Timesheet Entry Response DTO
 */
export class TimesheetEntryResponseDto {
  id: number;
  timesheetId: number;
  entryDate: Date;
  hours: number;
  billable: boolean;
  projectId: number | null;
  taskId: number | null;
  description: string | null;
  billingRate: number | null;
  billingAmount: number | null;
  costRate: number | null;
  costAmount: number | null;
  entryMetadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;
}


