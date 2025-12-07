import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ResourceType, ResourceStatus } from '../entities/resource.entity';

/**
 * Create Resource DTO
 */
export class CreateResourceDto {
  @IsString()
  resourceName: string;

  @IsOptional()
  @IsString()
  resourceDescription?: string;

  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ResourceStatus)
  resourceStatus?: ResourceStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organizationId?: number;

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
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  maxAdvanceBookingDays?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  minBookingDurationMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  maxBookingDurationMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  cancellationHours?: number;

  @IsOptional()
  @IsObject()
  maintenanceSchedule?: Record<string, any>;

  @IsOptional()
  @IsObject()
  availabilityRules?: Record<string, any>;

  @IsOptional()
  @IsObject()
  resourceMetadata?: Record<string, any>;
}
