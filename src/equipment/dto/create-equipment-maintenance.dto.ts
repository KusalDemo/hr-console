import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsArray,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MaintenanceType } from '../entities/equipment-maintenance.entity';

/**
 * Create Equipment Maintenance DTO
 */
export class CreateEquipmentMaintenanceDto {
  @IsNumber()
  @Type(() => Number)
  equipmentId: number;

  @IsEnum(MaintenanceType)
  maintenanceType: MaintenanceType;

  @IsString()
  maintenanceTitle: string;

  @IsOptional()
  @IsString()
  maintenanceDescription?: string;

  @IsDateString()
  scheduledDate: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  technicianId?: number;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maintenanceCost?: number;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  partsReplaced?: Array<{ partName: string; partNumber?: string; cost?: number }>;

  @IsOptional()
  @IsString()
  maintenanceNotes?: string;
}
