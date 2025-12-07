import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleFrequency, ScheduleStatus } from '../entities/report-schedule.entity';

/**
 * Create Report Schedule DTO
 */
export class CreateReportScheduleDto {
  @IsNumber()
  @Type(() => Number)
  reportDefinitionId: number;

  @IsString()
  scheduleName: string;

  @IsOptional()
  @IsString()
  scheduleDescription?: string;

  @IsEnum(ScheduleFrequency)
  frequency: ScheduleFrequency;

  @IsOptional()
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  outputFormat?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emailRecipients?: string[];

  @IsOptional()
  @IsString()
  emailSubject?: string;

  @IsOptional()
  @IsString()
  emailBody?: string;

  @IsOptional()
  @IsObject()
  scheduleConfig?: Record<string, any>;
}
