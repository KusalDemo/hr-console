import { IsNumber, IsDateString, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Assign Calendar to Employee DTO
 */
export class AssignCalendarToEmployeeDto {
  @IsNumber()
  @Type(() => Number)
  employeeId: number;

  @IsNumber()
  @Type(() => Number)
  calendarId: number;

  @IsDateString()
  effectiveStartDate: string;

  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;

  @IsOptional()
  @IsString()
  assignmentNotes?: string;
}
