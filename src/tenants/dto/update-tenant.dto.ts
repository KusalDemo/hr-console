import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';

/**
 * Update Tenant Request DTO
 * Used for updating tenant information
 * All fields are optional - only provided fields will be updated
 * 
 * Supports both 'active' and 'isActive' property names for backward compatibility
 */
export class UpdateTenantDto {
  @IsOptional()
  @IsString({ message: 'Tenant name must be a string' })
  @MinLength(2, { message: 'Tenant name must be at least 2 characters' })
  @MaxLength(255, { message: 'Tenant name must not exceed 255 characters' })
  name?: string;

  // Accept 'active' property for backward compatibility
  @IsOptional()
  @IsBoolean({ message: 'active must be a boolean' })
  active?: boolean;

  // Support 'isActive' property name (preferred)
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}

