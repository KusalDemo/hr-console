import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator';
import { IsValidEmail } from '../../common/validators/email.validator';

/**
 * MFA Verification Request DTO
 * Used to verify MFA code after initial login
 */
export class VerifyMfaDto {
  @IsNotEmpty({ message: 'MFA token is required' })
  @IsString({ message: 'MFA token must be a string' })
  mfaToken: string;

  @IsNotEmpty({ message: 'MFA code is required' })
  @IsString({ message: 'MFA code must be a string' })
  @Length(6, 6, { message: 'MFA code must be 6 digits' })
  mfaCode: string;
}

/**
 * MFA Setup Request DTO
 * Used to initiate MFA setup for a user
 */
export class SetupMfaDto {
  @IsOptional()
  @IsString({ message: 'Email must be a string' })
  @IsValidEmail({ message: 'Email must be a valid email address' })
  email?: string;
}

/**
 * MFA Setup Response DTO
 * Response after initiating MFA setup
 */
export class MfaSetupResponseDto {
  @IsString()
  secret: string; // Secret key for TOTP

  @IsString()
  qrCode: string; // QR code data URL for scanning

  @IsString({ each: true })
  backupCodes: string[]; // Backup codes for recovery
}

/**
 * MFA Disable Request DTO
 * Used to disable MFA for a user
 */
export class DisableMfaDto {
  @IsNotEmpty({ message: 'Password is required to disable MFA' })
  @IsString({ message: 'Password must be a string' })
  password: string;

  @IsOptional()
  @IsString({ message: 'MFA code must be a string' })
  @Length(6, 6, { message: 'MFA code must be 6 digits' })
  mfaCode?: string;
}

