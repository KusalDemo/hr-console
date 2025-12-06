import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Refresh Token Request DTO
 * Used to refresh an expired access token
 */
export class RefreshTokenDto {
  @IsNotEmpty({ message: 'Refresh token is required' })
  @IsString({ message: 'Refresh token must be a string' })
  refreshToken: string;
}

