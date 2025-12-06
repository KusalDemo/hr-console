import { IsNumber, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create Timesheet DTO
 */
export class CreateTimesheetDto {
  @IsNumber()
  @Type(() => Number)
  employeeId: number;

  @IsNumber()
  @Type(() => Number)
  periodId: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organizationId?: number;
}

