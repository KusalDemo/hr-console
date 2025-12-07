import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { IsValidEmail } from '../../common/validators/email.validator';

/**
 * Login Request DTO
 * Used for authenticating super admin, tenant admin, and regular users
 */
export class LoginDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsString({ message: 'Email must be a string' })
  @IsValidEmail({ message: 'Email must be a valid email address' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(1, { message: 'Password cannot be empty' })
  password: string;

  @IsOptional()
  @IsString({ message: 'MFA code must be a string' })
  mfaCode?: string;

  @IsOptional()
  @IsString({ message: 'Organization ID must be a string' })
  organizationId?: string;
}
