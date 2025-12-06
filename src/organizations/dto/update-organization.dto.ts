import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { OrganizationType, OrganizationStatus } from '../entities/organization.entity';

/**
 * Update Organization Request DTO
 * Used for updating organization information
 * All fields are optional - only provided fields will be updated
 */
export class UpdateOrganizationDto {
  @IsOptional()
  @IsString({ message: 'Organization name must be a string' })
  @MinLength(2, { message: 'Organization name must be at least 2 characters' })
  @MaxLength(255, { message: 'Organization name must not exceed 255 characters' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Display name must be a string' })
  @MaxLength(255, { message: 'Display name must not exceed 255 characters' })
  displayName?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Parent organization ID must be a number' })
  parentOrganizationId?: number | null;

  @IsOptional()
  @IsEnum(OrganizationType, {
    message: `Organization type must be one of: ${Object.values(OrganizationType).join(', ')}`,
  })
  organizationType?: OrganizationType;

  @IsOptional()
  @IsEnum(OrganizationStatus, {
    message: `Organization status must be one of: ${Object.values(OrganizationStatus).join(', ')}`,
  })
  status?: OrganizationStatus;

  // Address fields
  @IsOptional()
  @IsString({ message: 'Address line 1 must be a string' })
  @MaxLength(255, { message: 'Address line 1 must not exceed 255 characters' })
  addressLine1?: string;

  @IsOptional()
  @IsString({ message: 'Address line 2 must be a string' })
  @MaxLength(255, { message: 'Address line 2 must not exceed 255 characters' })
  addressLine2?: string;

  @IsOptional()
  @IsString({ message: 'City must be a string' })
  @MaxLength(128, { message: 'City must not exceed 128 characters' })
  city?: string;

  @IsOptional()
  @IsString({ message: 'State must be a string' })
  @MaxLength(128, { message: 'State must not exceed 128 characters' })
  state?: string;

  @IsOptional()
  @IsString({ message: 'Postal code must be a string' })
  @MaxLength(32, { message: 'Postal code must not exceed 32 characters' })
  postalCode?: string;

  @IsOptional()
  @IsString({ message: 'Country must be a string' })
  @MaxLength(64, { message: 'Country must not exceed 64 characters' })
  country?: string;

  // Contact information
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(32, { message: 'Phone must not exceed 32 characters' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Email must be a string' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: 'Email must be a valid email address',
  })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Website must be a string' })
  @MaxLength(255, { message: 'Website must not exceed 255 characters' })
  @Matches(/^https?:\/\/.+/, {
    message: 'Website must be a valid URL starting with http:// or https://',
  })
  website?: string;

  // Business information
  @IsOptional()
  @IsString({ message: 'Tax ID must be a string' })
  @MaxLength(128, { message: 'Tax ID must not exceed 128 characters' })
  taxId?: string;

  @IsOptional()
  @IsString({ message: 'Registration number must be a string' })
  @MaxLength(128, { message: 'Registration number must not exceed 128 characters' })
  registrationNumber?: string;

  @IsOptional()
  @IsBoolean({ message: 'isDefault must be a boolean' })
  isDefault?: boolean;
}

