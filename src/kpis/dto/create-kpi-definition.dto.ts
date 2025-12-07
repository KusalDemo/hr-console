import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import {
  KPICalculationType,
  KPIDataSourceType,
  KPIFrequency,
  KPIStatus,
} from '../entities/kpi-definition.entity';

/**
 * Create KPI Definition DTO
 */
export class CreateKPIDefinitionDto {
  @IsString()
  kpiName: string;

  @IsOptional()
  @IsString()
  kpiDescription?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsNumber()
  @Type(() => Number)
  organizationId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  departmentId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  teamId?: number;

  @IsEnum(KPICalculationType)
  calculationType: KPICalculationType;

  @IsEnum(KPIDataSourceType)
  dataSourceType: KPIDataSourceType;

  @IsOptional()
  @IsObject()
  dataSourceConfig?: Record<string, any>;

  @IsOptional()
  @IsString()
  calculationFormula?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsEnum(KPIFrequency)
  calculationFrequency: KPIFrequency;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  targetValue?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxThreshold?: number;

  @IsOptional()
  @IsObject()
  alertConfig?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  goalId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  keyResultId?: number;

  @IsOptional()
  @IsEnum(KPIStatus)
  status?: KPIStatus;

  @IsOptional()
  @IsObject()
  kpiMetadata?: Record<string, any>;
}
