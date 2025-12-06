import { Injectable, Logger } from '@nestjs/common';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { TenantAdminAuthService } from './tenant-admin-auth.service';
import { UserAuthService } from './user-auth.service';
import { LoginDto } from '../dto/login.dto';
import { TokenResponseDto, UserInfoDto } from '../dto/token-response.dto';
import {
  BusinessException,
  UnauthorizedException,
  ErrorCode,
} from '../../common/exceptions/business.exception';

/**
 * Unified Authentication Service
 * Orchestrates all authentication flows:
 * - Super Admin (no tenant header)
 * - Tenant Admin (with tenant header, checks admin.tenant_admin first)
 * - Regular User (with tenant header, checks tenant schema users)
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly superAdminAuthService: SuperAdminAuthService,
    private readonly tenantAdminAuthService: TenantAdminAuthService,
    private readonly userAuthService: UserAuthService,
  ) {}

  /**
   * Authenticate user based on tenant header
   * Determines user type and routes to appropriate authentication service
   * @param tenantKey - Tenant key from X-Tenant header (optional)
   * @param loginDto - Login credentials
   * @param ipAddress - Client IP address (for logging)
   * @param userAgent - Client user agent (for logging)
   * @returns Token response with user info
   * @throws UnauthorizedException if authentication fails
   */
  async login(
    tenantKey: string | undefined,
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ token: TokenResponseDto; user: UserInfoDto }> {
    const email = loginDto.email.trim().toLowerCase();

    // If no tenant header, try super admin login
    if (!tenantKey || tenantKey.trim() === '') {
      this.logger.log(`Super admin login attempt: email=${email}, ip=${ipAddress || 'unknown'}`);
      return this.authenticateSuperAdmin(loginDto, ipAddress, userAgent);
    }

    // Tenant header provided - try tenant admin first, then regular user
    const normalizedTenantKey = tenantKey.trim().toLowerCase();
    this.logger.log(
      `Tenant login attempt: tenant=${normalizedTenantKey}, email=${email}, ip=${ipAddress || 'unknown'}`,
    );

    return this.authenticateTenantUser(normalizedTenantKey, loginDto, ipAddress, userAgent);
  }

  /**
   * Authenticate super admin
   * No tenant header required
   */
  private async authenticateSuperAdmin(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ token: TokenResponseDto; user: UserInfoDto }> {
    try {
      const result = await this.superAdminAuthService.login(loginDto, ipAddress, userAgent);

      this.logger.log(
        `Super admin login successful: email=${loginDto.email}, userId=${result.user.userId}, ip=${ipAddress || 'unknown'}`,
      );

      return result;
    } catch (error) {
      this.logger.warn(
        `Super admin login failed: email=${loginDto.email}, error=${error instanceof Error ? error.message : 'Unknown error'}, ip=${ipAddress || 'unknown'}`,
      );

      // Re-throw the error to be handled by the controller
      throw error;
    }
  }

  /**
   * Authenticate tenant user (tenant admin or regular user)
   * Tries tenant admin first, then regular user
   */
  private async authenticateTenantUser(
    tenantKey: string,
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ token: TokenResponseDto; user: UserInfoDto }> {
    // Try tenant admin first
    try {
      const result = await this.tenantAdminAuthService.login(
        tenantKey,
        loginDto,
        ipAddress,
        userAgent,
      );

      this.logger.log(
        `Tenant admin login successful: tenant=${tenantKey}, email=${loginDto.email}, userId=${result.user.userId}, ip=${ipAddress || 'unknown'}`,
      );

      return result;
    } catch (error) {
      // If it's an authentication failure (wrong password, locked account, etc.), re-throw it
      // UnauthorizedException and BusinessException with 401/403 are real auth failures
      if (
        error instanceof UnauthorizedException ||
        (error instanceof BusinessException &&
          (error.getStatus() === 401 || error.getStatus() === 403))
      ) {
        // This is a real authentication failure for tenant admin
        this.logger.warn(
          `Tenant admin login failed: tenant=${tenantKey}, email=${loginDto.email}, error=${error instanceof Error ? error.message : 'Unknown error'}, ip=${ipAddress || 'unknown'}`,
        );
        throw error;
      }

      // If tenant admin not found or other non-critical error, try regular user
      this.logger.debug(
        `Tenant admin not found or error, trying regular user: tenant=${tenantKey}, email=${loginDto.email}, error=${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // Try regular user authentication
    try {
      const result = await this.userAuthService.login(
        tenantKey,
        loginDto,
        ipAddress,
        userAgent,
      );

      this.logger.log(
        `Regular user login successful: tenant=${tenantKey}, email=${loginDto.email}, userId=${result.user.userId}, ip=${ipAddress || 'unknown'}`,
      );

      return result;
    } catch (error) {
      this.logger.warn(
        `Regular user login failed: tenant=${tenantKey}, email=${loginDto.email}, error=${error instanceof Error ? error.message : 'Unknown error'}, ip=${ipAddress || 'unknown'}`,
      );

      // Re-throw the error to be handled by the controller
      throw error;
    }
  }

  /**
   * Verify MFA code
   * Determines user type and routes to appropriate service
   */
  async verifyMfa(
    tenantKey: string | undefined,
    email: string,
    mfaCode: string,
  ): Promise<{ token: TokenResponseDto; user: UserInfoDto }> {
    // If no tenant header, try super admin MFA
    if (!tenantKey || tenantKey.trim() === '') {
      return this.superAdminAuthService.verifyMfa(email, mfaCode);
    }

    // Try tenant admin MFA first
    try {
      return await this.tenantAdminAuthService.verifyMfa(tenantKey.trim().toLowerCase(), email, mfaCode);
    } catch (error) {
      // If tenant admin MFA fails, try regular user MFA
      // Note: Regular user MFA verification would need to be implemented in UserAuthService
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'MFA verification failed or not supported for this user type',
      );
    }
  }

  /**
   * Check if account is locked
   * Determines user type and checks appropriate service
   */
  async isAccountLocked(tenantKey: string | undefined, email: string): Promise<boolean> {
    // If no tenant header, check super admin
    if (!tenantKey || tenantKey.trim() === '') {
      return this.superAdminAuthService.isAccountLocked(email);
    }

    const normalizedTenantKey = tenantKey.trim().toLowerCase();

    // Try tenant admin first
    try {
      return await this.tenantAdminAuthService.isAccountLocked(normalizedTenantKey, email);
    } catch (error) {
      // If tenant admin check fails, account is not locked for tenant admin
      // Regular user lock check would need to be implemented in UserAuthService
      return false;
    }
  }

  /**
   * Get remaining login attempts
   * Determines user type and checks appropriate service
   */
  async getRemainingAttempts(tenantKey: string | undefined, email: string): Promise<number> {
    // If no tenant header, check super admin
    if (!tenantKey || tenantKey.trim() === '') {
      return this.superAdminAuthService.getRemainingAttempts(email);
    }

    const normalizedTenantKey = tenantKey.trim().toLowerCase();

    // Try tenant admin first
    try {
      return await this.tenantAdminAuthService.getRemainingAttempts(normalizedTenantKey, email);
    } catch (error) {
      // If tenant admin check fails, return 0
      // Regular user attempt check would need to be implemented in UserAuthService
      return 0;
    }
  }
}

