import { IsOptional, IsEnum, IsNumber, IsArray, IsDateString, IsBoolean, IsString } from 'class-validator';
import { AuditLevel, ActivityCategory } from '../entities/audit-log.entity';

/**
 * Audit Log Search DTO
 */
export class AuditLogSearchDto {
  @IsOptional()
  @IsString()
  activityType?: string;

  @IsOptional()
  @IsEnum(ActivityCategory)
  activityCategory?: ActivityCategory;

  @IsOptional()
  @IsString()
  actorType?: string;

  @IsOptional()
  @IsNumber()
  actorId?: number;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsNumber()
  targetId?: number;

  @IsOptional()
  @IsNumber()
  organizationId?: number;

  @IsOptional()
  @IsEnum(AuditLevel)
  auditLevel?: AuditLevel;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  complianceTags?: string[];
}
