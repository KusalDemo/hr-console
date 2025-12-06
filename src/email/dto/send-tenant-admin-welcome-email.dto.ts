import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

/**
 * DTO for sending tenant admin welcome email
 */
export class SendTenantAdminWelcomeEmailDto {
  @IsNotEmpty({ message: 'Tenant admin name is required' })
  @IsString({ message: 'Tenant admin name must be a string' })
  tenantAdminName: string;

  @IsNotEmpty({ message: 'Tenant admin email is required' })
  @IsEmail({}, { message: 'Tenant admin email must be a valid email address' })
  tenantAdminEmail: string;

  @IsNotEmpty({ message: 'Tenant admin password is required' })
  @IsString({ message: 'Tenant admin password must be a string' })
  tenantAdminPassword: string;

  @IsNotEmpty({ message: 'Tenant name is required' })
  @IsString({ message: 'Tenant name must be a string' })
  tenantName: string;

  @IsNotEmpty({ message: 'Tenant key is required' })
  @IsString({ message: 'Tenant key must be a string' })
  tenantKey: string;

  @IsOptional()
  @IsString({ message: 'Organization name must be a string' })
  organizationName?: string | null;
}

