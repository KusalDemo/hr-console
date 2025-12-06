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
  ContactCategory,
  ContactStatus,
  CompanySize,
} from '../entities/contact.entity';

/**
 * Update Contact DTO
 */
export class UpdateContactDto {
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
  @IsEnum(ContactCategory)
  contactCategory?: ContactCategory;

  @IsOptional()
  @IsEnum(ContactStatus)
  contactStatus?: ContactStatus;

  @IsOptional()
  @IsString()
  contactSource?: string;

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
  phoneWork?: string;

  @IsOptional()
  @IsString()
  phoneFax?: string;

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
  @IsString()
  addressType?: string;

  @IsOptional()
  @IsEnum(CompanySize)
  companySize?: CompanySize;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  lastContactDate?: string;

  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: string;

  @IsOptional()
  @IsObject()
  contactMetadata?: Record<string, any>;
}

