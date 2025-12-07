import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  LeadStatus,
  LeadSource,
  LeadPriority,
} from '../entities/lead.entity';

/**
 * Update Lead DTO
 */
export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  emailSecondary?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  phoneMobile?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  leadStatus?: LeadStatus;

  @IsOptional()
  @IsEnum(LeadSource)
  leadSource?: LeadSource;

  @IsOptional()
  @IsEnum(LeadPriority)
  leadPriority?: LeadPriority;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  assignedTo?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  campaignId?: number;

  @IsOptional()
  @IsString()
  campaignName?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  companySize?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  estimatedValue?: number;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsDateString()
  lastContactDate?: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  leadMetadata?: Record<string, any>;
}


