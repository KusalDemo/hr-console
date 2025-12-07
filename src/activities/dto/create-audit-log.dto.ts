import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { AuditLevel, ActivityCategory, ActorType } from '../entities/audit-log.entity';

/**
 * Create Audit Log DTO
 */
export class CreateAuditLogDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  activityType: string;

  @IsOptional()
  @IsEnum(ActivityCategory)
  activityCategory?: ActivityCategory;

  @IsEnum(ActorType)
  actorType: ActorType;

  @IsOptional()
  @IsNumber()
  actorId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  actorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  targetType?: string;

  @IsOptional()
  @IsNumber()
  targetId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  targetName?: string;

  @IsOptional()
  @IsNumber()
  organizationId?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsObject()
  beforeValues?: Record<string, any>;

  @IsOptional()
  @IsObject()
  afterValues?: Record<string, any>;

  @IsOptional()
  @IsString()
  @MaxLength(45)
  ipAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  requestId?: string;

  @IsOptional()
  @IsEnum(AuditLevel)
  auditLevel?: AuditLevel;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  complianceTags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
