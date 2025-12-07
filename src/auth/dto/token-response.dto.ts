import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

/**
 * Token Response DTO
 * Response after successful authentication
 */
export class TokenResponseDto {
  @IsString()
  accessToken: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsNumber()
  expiresIn: number; // Expiration time in seconds

  @IsString()
  tokenType: 'Bearer';

  @IsOptional()
  @IsBoolean()
  mfaRequired?: boolean;

  @IsOptional()
  @IsString()
  mfaToken?: string; // Temporary token for MFA verification
}

/**
 * User information included in token response
 */
export class UserInfoDto {
  @IsNumber()
  userId: number;

  @IsString()
  email: string;

  @IsString()
  fullName: string;

  @IsString({ each: true })
  roles: string[];

  @IsString()
  tenant: string;

  @IsOptional()
  @IsNumber()
  organizationId?: number;

  @IsOptional()
  @IsNumber({}, { each: true })
  organizationIds?: number[];

  @IsString()
  userType: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'USER';
}

/**
 * Complete authentication response with token and user info
 */
export class AuthResponseDto {
  token: TokenResponseDto;
  user: UserInfoDto;
}
