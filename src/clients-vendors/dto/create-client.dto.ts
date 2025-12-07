import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ClientStatus, ClientTier } from '../entities/client.entity';

/**
 * Create Client DTO
 */
export class CreateClientDto {
  @IsOptional()
  @IsString()
  clientNumber?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  contactId?: number;

  @IsOptional()
  @IsEnum(ClientStatus)
  clientStatus?: ClientStatus;

  @IsOptional()
  @IsEnum(ClientTier)
  clientTier?: ClientTier;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  organizationId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  accountManagerId?: number;

  @IsOptional()
  @IsDateString()
  clientSince?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  annualRevenue?: number;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  numberOfEmployees?: number;

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
  @IsNumber()
  @Type(() => Number)
  creditLimit?: number;

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
  clientMetadata?: Record<string, any>;
}
