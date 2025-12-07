import { IsString, IsEnum, IsDateString, IsOptional, IsNumber } from 'class-validator';
import { AuditType } from '../entities/compliance-audit.entity';

export class CreateAuditDto {
  @IsNumber()
  frameworkId: number;

  @IsString()
  auditName: string;

  @IsEnum(AuditType)
  auditType: AuditType;

  @IsDateString()
  auditStartDate: string;

  @IsOptional()
  @IsNumber()
  checklistId?: number;

  @IsOptional()
  @IsNumber()
  auditLeadId?: number;
}
