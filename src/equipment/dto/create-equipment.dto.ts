import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EquipmentStatus } from '../entities/equipment.entity';

/**
 * Create Equipment DTO
 */
export class CreateEquipmentDto {
  @IsString()
  assetTag: string;

  @IsString()
  equipmentName: string;

  @IsOptional()
  @IsString()
  equipmentDescription?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  equipmentType?: string;

  @IsOptional()
  @IsEnum(EquipmentStatus)
  equipmentStatus?: EquipmentStatus;

  @IsNumber()
  @Type(() => Number)
  organizationId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  locationId?: number;

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  parentEquipmentId?: number;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  modelNumber?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  purchaseCost?: number;

  @IsOptional()
  @IsString()
  depreciationMethod?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  usefulLifeYears?: number;

  @IsOptional()
  @IsDateString()
  warrantyStartDate?: string;

  @IsOptional()
  @IsDateString()
  warrantyEndDate?: string;

  @IsOptional()
  @IsString()
  warrantyProvider?: string;

  @IsOptional()
  @IsString()
  warrantyDetails?: string;

  @IsOptional()
  @IsObject()
  maintenanceSchedule?: Record<string, any>;

  @IsOptional()
  @IsDateString()
  nextMaintenanceDate?: string;

  @IsOptional()
  @IsObject()
  equipmentMetadata?: Record<string, any>;
}
