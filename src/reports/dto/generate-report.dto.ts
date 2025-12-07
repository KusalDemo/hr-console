import { IsOptional, IsEnum, IsObject } from 'class-validator';
import { ReportOutputFormat } from '../entities/report-definition.entity';

/**
 * Generate Report DTO
 */
export class GenerateReportDto {
  @IsOptional()
  @IsEnum(ReportOutputFormat)
  outputFormat?: ReportOutputFormat;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}
