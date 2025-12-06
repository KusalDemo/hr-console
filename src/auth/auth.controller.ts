import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Request,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { PasswordChangeService } from './services/password-change.service';
import { AppConfigService } from '../config/config.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto, TokenResponseDto } from './dto/token-response.dto';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { UnauthorizedException } from '../common/exceptions/business.exception';
import { Public } from './decorators/public.decorator';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './interfaces/jwt-payload.interface';

/**
 * Authentication Controller
 * Handles authentication endpoints:
 * - POST /auth/login - User login
 * - POST /auth/refresh - Refresh access token
 * - POST /auth/logout - User logout
 */
@Controller('auth')
@UseInterceptors(TransformInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly passwordChangeService: PasswordChangeService,
    private readonly configService: AppConfigService,
  ) {}

  /**
   * Login endpoint
   * Supports three authentication flows:
   * - Super Admin (no X-Tenant header)
   * - Tenant Admin (with X-Tenant header, checked first)
   * - Regular User (with X-Tenant header, checked after tenant admin)
   *
   * @param loginDto - Login credentials
   * @param headers - Request headers (for X-Tenant, X-Forwarded-For, User-Agent)
   * @param request - Express request object
   * @returns Authentication response with token and user info
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Headers() headers: Record<string, string>,
    @Request() request: ExpressRequest,
  ): Promise<AuthResponseDto> {
    // Extract tenant key from X-Tenant header
    const tenantKey = headers['x-tenant'] || headers['X-Tenant'];

    // Extract IP address (check X-Forwarded-For first, then request IP)
    const ipAddress =
      headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      headers['X-Forwarded-For']?.split(',')[0]?.trim() ||
      (request as any).ip ||
      (request as any).connection?.remoteAddress ||
      'unknown';

    // Extract User-Agent
    const userAgent = headers['user-agent'] || headers['User-Agent'] || 'unknown';

    try {
      const result = await this.authService.login(
        tenantKey,
        loginDto,
        ipAddress,
        userAgent,
      );

      return result;
    } catch (error) {
      // Re-throw the error to be handled by the global exception filter
      throw error;
    }
  }

  /**
   * Refresh token endpoint
   * Generates a new access token using a valid refresh token
   *
   * @param refreshTokenDto - Refresh token request
   * @returns New token response
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<{ token: TokenResponseDto }> {
    // Verify refresh token
    const payload = this.tokenService.verifyRefreshToken(refreshTokenDto.refreshToken);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Generate new access token
    const accessToken = this.tokenService.generateAccessToken({
      userId: payload.userId!,
      email: payload.email!,
      fullName: payload.preferred_username || payload.email!,
      roles: payload.roles || [],
      tenant: payload.tenant!,
      organizationId: payload.organizationId,
      organizationIds: payload.organizationIds,
      userType: payload.userType!,
    });

    // Optionally generate new refresh token (refresh token rotation)
    // For now, we'll reuse the same refresh token
    const refreshToken = refreshTokenDto.refreshToken;

    // Build token response
    const tokenResponse: TokenResponseDto = {
      accessToken,
      refreshToken,
      expiresIn: this.getAccessTokenExpirationSeconds(),
      tokenType: 'Bearer',
    };

    return { token: tokenResponse };
  }

  /**
   * Logout endpoint
   * Invalidates tokens (if token blacklisting is implemented)
   *
   * @param logoutDto - Logout request (optional refresh token to invalidate)
   * @returns Success message
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() logoutDto: LogoutDto): Promise<{ message: string }> {
    // TODO: Implement token blacklisting/invalidation
    // For now, we'll just return success
    // In a full implementation, we would:
    // 1. Add refresh token to blacklist (Redis or database)
    // 2. Invalidate access token (if we're tracking sessions)
    // 3. Clear any session data

    if (logoutDto.refreshToken) {
      // Verify token is valid before attempting to invalidate
      const payload = this.tokenService.verifyRefreshToken(logoutDto.refreshToken);
      if (payload) {
        // TODO: Add to blacklist
        // await this.tokenBlacklistService.add(logoutDto.refreshToken);
      }
    }

    return {
      message: 'Logged out successfully',
    };
  }

  /**
   * Change password endpoint
   * Updates password in both tenant schema and admin.tenant_admin table (for tenant admins)
   * 
   * @param changePasswordDto - Password change request
   * @param user - Current user from JWT
   * @param headers - Request headers (for X-Tenant)
   * @returns Success message
   */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() user: JwtPayload,
    @Headers() headers: Record<string, string>,
  ): Promise<{ success: boolean; message: string }> {
    // Extract tenant key from X-Tenant header or JWT payload
    const tenantKey = headers['x-tenant'] || headers['X-Tenant'] || user.tenant;

    if (!tenantKey) {
      throw new BadRequestException('Tenant key is required');
    }

    // Determine if user is tenant admin or regular user
    if (user.userType === 'TENANT_ADMIN') {
      // For tenant admin, update both tenant schema and admin.tenant_admin
      return this.passwordChangeService.changeTenantAdminPassword(
        tenantKey,
        user.email,
        changePasswordDto.currentPassword,
        changePasswordDto.newPassword,
      );
    } else {
      // For regular user, update only tenant schema
      return this.passwordChangeService.changeUserPassword(
        tenantKey,
        user.email,
        changePasswordDto.currentPassword,
        changePasswordDto.newPassword,
      );
    }
  }

  /**
   * Get access token expiration in seconds
   * Helper method to calculate expiration time from config
   */
  private getAccessTokenExpirationSeconds(): number {
    // Parse expiration time from config (e.g., "15m" -> 900 seconds)
    const expiresIn = this.configService.jwtExpiresIn;
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 15 * 60; // Default to 15 minutes
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 15 * 60; // Default to 15 minutes
    }
  }
}

