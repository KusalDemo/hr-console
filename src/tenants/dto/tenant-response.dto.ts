import { IsNumber, IsString, IsBoolean, IsDateString } from 'class-validator';

/**
 * Tenant Response DTO
 * Represents a tenant in API responses
 */
export class TenantResponseDto {
  @IsNumber()
  id: number;

  @IsString()
  tenantKey: string;

  @IsString()
  name: string;

  @IsBoolean()
  isActive: boolean;

  @IsDateString()
  createdAt: string;

  @IsDateString()
  updatedAt: string;
}

/**
 * Tenant Detail Response DTO
 * Extended tenant information with additional details
 */
export class TenantDetailResponseDto extends TenantResponseDto {
  // Additional fields can be added here in the future
  // For example: subscription info, organization count, user count, etc.
}

/**
 * Tenant Creation Response DTO
 * Response after successfully creating a tenant
 */
export class TenantCreationResponseDto {
  tenant: TenantResponseDto;
  message: string;
  tenantAdminEmail: string;
  emailSent?: boolean;
  emailError?: string;
}
