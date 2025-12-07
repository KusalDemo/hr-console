import { IsOptional, IsString } from 'class-validator';

/**
 * Logout Request DTO
 * Used to logout a user and invalidate tokens
 */
export class LogoutDto {
  @IsOptional()
  @IsString({ message: 'Refresh token must be a string' })
  refreshToken?: string; // Optional refresh token to invalidate
}
