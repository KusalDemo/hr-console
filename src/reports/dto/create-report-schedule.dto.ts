import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsObject,
  IsArray,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ScheduleFrequency,
  ScheduleStatus,
} from '../entities/report-schedule.entity';
import { ReportOutputFormat } from '../entities/report-definition.entity';

/**
 * Create Report Schedule DTO
 */
export class CreateReportScheduleDto {
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
  @IsEnum(ReportOutputFormat)
  outputFormat?: ReportOutputFormat;

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
