import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VendorType, VendorStatus } from '../entities/vendor.entity';

/**
 * Create Vendor DTO
 */
export class CreateVendorDto {
  @IsOptional()
  @IsString()
  vendorNumber?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  contactId?: number;

  @IsEnum(VendorType)
  vendorType: VendorType;

  @IsOptional()
  @IsEnum(VendorStatus)
  vendorStatus?: VendorStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organizationId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  vendorManagerId?: number;

  @IsOptional()
  @IsDateString()
  vendorSince?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  billingAddressLine1?: string;

  @IsOptional()
  @IsString()
  billingAddressLine2?: string;

  @IsOptional()
  @IsString()
  billingCity?: string;

  @IsOptional()
  @IsString()
  billingState?: string;

  @IsOptional()
  @IsString()
  billingPostalCode?: string;

  @IsOptional()
  @IsString()
  billingCountry?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  vendorMetadata?: Record<string, any>;
}

