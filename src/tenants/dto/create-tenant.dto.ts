import {
  IsString,
  IsNotEmpty,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsValidEmail } from '../../common/validators/email.validator';
import { IsValidTenantKey } from '../../common/validators/tenant-key.validator';
import { IsStrongPassword } from '../../common/validators/password.validator';

/**
 * Create Tenant Request DTO
 * Used for creating a new tenant with initial tenant admin user
 */
export class CreateTenantDto {
  @IsNotEmpty({ message: 'Tenant key is required' })
  @IsString({ message: 'Tenant key must be a string' })
  @IsValidTenantKey({
    message:
      'Tenant key must be 3-64 characters, lowercase alphanumeric with hyphens or underscores, and cannot start or end with a hyphen or underscore',
  })
  tenantKey: string;

  @IsNotEmpty({ message: 'Tenant name is required' })
  @IsString({ message: 'Tenant name must be a string' })
  @MinLength(2, { message: 'Tenant name must be at least 2 characters' })
  @MaxLength(255, { message: 'Tenant name must not exceed 255 characters' })
  name: string;

  @IsNotEmpty({ message: 'Tenant admin email is required' })
  @IsString({ message: 'Tenant admin email must be a string' })
  @IsValidEmail({ message: 'Tenant admin email must be a valid email address' })
  tenantAdminEmail: string;

  @IsNotEmpty({ message: 'Tenant admin password is required' })
  @IsString({ message: 'Tenant admin password must be a string' })
  @IsStrongPassword({
    message:
      'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  tenantAdminPassword: string;

  @IsNotEmpty({ message: 'Tenant admin full name is required' })
  @IsString({ message: 'Tenant admin full name must be a string' })
  @MinLength(2, { message: 'Tenant admin full name must be at least 2 characters' })
  @MaxLength(255, { message: 'Tenant admin full name must not exceed 255 characters' })
  tenantAdminFullName: string;
}

