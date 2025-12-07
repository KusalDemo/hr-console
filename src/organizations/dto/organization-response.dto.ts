import { IsNumber, IsString, IsBoolean, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { OrganizationType, OrganizationStatus } from '../entities/organization.entity';

/**
 * Organization Response DTO
 * Represents an organization in API responses
 */
export class OrganizationResponseDto {
  @IsNumber()
  id: number;

  @IsString()
  organizationKey: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  displayName?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsNumber()
  parentOrganizationId?: number | null;

  @IsEnum(OrganizationType)
  organizationType: OrganizationType;

  @IsEnum(OrganizationStatus)
  status: OrganizationStatus;

  // Address fields
  @IsOptional()
  @IsString()
  addressLine1?: string | null;

  @IsOptional()
  @IsString()
  addressLine2?: string | null;

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsOptional()
  @IsString()
  state?: string | null;

  @IsOptional()
  @IsString()
  postalCode?: string | null;

  @IsOptional()
  @IsString()
  country?: string | null;

  // Contact information
  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  email?: string | null;

  @IsOptional()
  @IsString()
  website?: string | null;

  // Business information
  @IsOptional()
  @IsString()
  taxId?: string | null;

  @IsOptional()
  @IsString()
  registrationNumber?: string | null;

  @IsBoolean()
  isDefault: boolean;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;
}

/**
 * Organization Detail Response DTO
 * Extended organization information with parent organization details
 */
export class OrganizationDetailResponseDto extends OrganizationResponseDto {
  @IsOptional()
  parentOrganization?: OrganizationResponseDto | null;

  @IsOptional()
  @IsNumber()
  childOrganizationCount?: number;

  @IsOptional()
  @IsNumber()
  memberCount?: number;
}

/**
 * Organization Creation Response DTO
 * Response after successfully creating an organization
 */
export class OrganizationCreationResponseDto {
  organization: OrganizationResponseDto;
  message: string;
}

/**
 * Organization List Response DTO
 * Response for paginated organization lists
 */
export class OrganizationListResponseDto {
  organizations: OrganizationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
