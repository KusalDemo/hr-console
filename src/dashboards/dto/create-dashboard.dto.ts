import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DashboardType, DashboardLayoutType } from '../entities/dashboard.entity';

/**
 * Create Dashboard DTO
 */
export class CreateDashboardDto {
  @IsString()
  dashboardName: string;

  @IsOptional()
  @IsString()
  dashboardDescription?: string;

  @IsNumber()
  @Type(() => Number)
  organizationId: number;

  @IsOptional()
  @IsEnum(DashboardType)
  dashboardType?: DashboardType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ownerId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  departmentId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  teamId?: number;

  @IsOptional()
  @IsEnum(DashboardLayoutType)
  layoutType?: DashboardLayoutType;

  @IsOptional()
  @IsObject()
  layoutConfig?: Record<string, any>;

  @IsOptional()
  @IsArray()
  widgetConfigs?: Record<string, any>[];

  @IsOptional()
  @IsBoolean()
  isShared?: boolean;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  templateId?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  sharingConfig?: Record<string, any>;

  @IsOptional()
  @IsObject()
  dashboardMetadata?: Record<string, any>;
}
