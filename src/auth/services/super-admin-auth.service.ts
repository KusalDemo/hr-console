import { Injectable } from '@nestjs/common';
import { SuperAdminRepository } from '../../admin/repositories/super-admin.repository';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { LoginDto } from '../dto/login.dto';
import { TokenResponseDto, UserInfoDto } from '../dto/token-response.dto';
import {
  BusinessException,
  UnauthorizedException,
  ErrorCode,
} from '../../common/exceptions/business.exception';

/**
 * Super Admin Authentication Service
 * Handles authentication for super administrators
 * - Account lockout: 5 failed attempts, 30 minute lockout
 * - Failed login attempt tracking
 * - Password validation
 */
@Injectable()
export class SuperAdminAuthService {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 30;

  constructor(
    private readonly superAdminRepository: SuperAdminRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Authenticate super admin
   * @param loginDto - Login credentials
   * @param ipAddress - Client IP address (for logging)
   * @param userAgent - Client user agent (for logging)
   * @returns Token response with user info
   * @throws UnauthorizedException if authentication fails
   */
  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ token: TokenResponseDto; user: UserInfoDto }> {
    const email = loginDto.email.trim().toLowerCase();

    // Find super admin by email
    const superAdmin = await this.superAdminRepository.findByEmail(email);

    if (!superAdmin) {
      // Don't reveal if user exists or not (security best practice)
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is active
    if (!superAdmin.isActive) {
      throw new BusinessException(
        ErrorCode.ACCOUNT_LOCKED,
        'Account is inactive. Please contact administrator.',
      );
    }

    // Check if account is locked
    if (superAdmin.isAccountLocked()) {
      const lockoutMessage = superAdmin.lockedUntil
        ? `Account is locked until ${superAdmin.lockedUntil.toISOString()}. Please try again later.`
        : 'Account is locked. Please contact administrator.';

      throw new BusinessException(ErrorCode.ACCOUNT_LOCKED, lockoutMessage);
    }

    // Validate password
    const isPasswordValid = await this.passwordService.verifyPassword(
      loginDto.password,
      superAdmin.passwordHash,
    );

    if (!isPasswordValid) {
      // Increment failed login attempts
      await this.superAdminRepository.incrementFailedLoginAttempts(superAdmin.id);

      // Reload to get updated failed attempts count
      const updatedAdmin = await this.superAdminRepository.findById(superAdmin.id);
      if (!updatedAdmin) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Check if account should be locked
      if (updatedAdmin.failedLoginAttempts >= this.MAX_FAILED_ATTEMPTS) {
        const lockoutUntil = new Date();
        lockoutUntil.setMinutes(lockoutUntil.getMinutes() + this.LOCKOUT_DURATION_MINUTES);

        await this.superAdminRepository.lockAccount(updatedAdmin.id, lockoutUntil);

        throw new BusinessException(
          ErrorCode.ACCOUNT_LOCKED,
          `Account has been locked due to too many failed login attempts. Please try again after ${this.LOCKOUT_DURATION_MINUTES} minutes.`,
        );
      }

      // Calculate remaining attempts
      const remainingAttempts = this.MAX_FAILED_ATTEMPTS - updatedAdmin.failedLoginAttempts;

      throw new UnauthorizedException(
        `Invalid email or password. ${remainingAttempts} attempt(s) remaining before account lockout.`,
      );
    }

    // Check if password has expired
    if (superAdmin.isPasswordExpired()) {
      await this.superAdminRepository.requirePasswordChange(superAdmin.id);
      throw new BusinessException(
        ErrorCode.UNAUTHORIZED,
        'Password has expired. Please change your password.',
      );
    }

    // Check if password change is required
    if (superAdmin.requiresPasswordChange) {
      throw new BusinessException(
        ErrorCode.UNAUTHORIZED,
        'Password change is required. Please change your password before logging in.',
      );
    }

    // Handle MFA if enabled
    if (superAdmin.mfaEnabled) {
      if (!loginDto.mfaCode) {
        // Return MFA required response
        // In a full implementation, we would generate a temporary MFA token here
        throw new BusinessException(
          ErrorCode.UNAUTHORIZED,
          'Multi-factor authentication is required. Please provide MFA code.',
          undefined,
          { mfaRequired: true },
        );
      }

      // TODO: Verify MFA code
      // For now, we'll skip MFA verification in this commit
      // This will be implemented in a future commit
    }

    // Reset failed login attempts on successful login
    await this.superAdminRepository.resetFailedLoginAttempts(superAdmin.id);

    // Unlock account if it was locked (in case lockout period expired)
    if (superAdmin.isLocked && !superAdmin.isAccountLocked()) {
      await this.superAdminRepository.unlockAccount(superAdmin.id);
    }

    // Generate tokens
    const tokenPair = this.tokenService.generateTokenPair({
      userId: superAdmin.id,
      email: superAdmin.email,
      fullName: superAdmin.fullName,
      roles: ['ROLE_SUPER_ADMIN'],
      tenant: 'admin',
      userType: 'SUPER_ADMIN',
    });

    // Build token response
    const tokenResponse: TokenResponseDto = {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.expiresIn,
      tokenType: tokenPair.tokenType,
    };

    // Build user info
    const userInfo: UserInfoDto = {
      userId: superAdmin.id,
      email: superAdmin.email,
      fullName: superAdmin.fullName,
      roles: ['ROLE_SUPER_ADMIN'],
      tenant: 'admin',
      userType: 'SUPER_ADMIN',
    };

    return {
      token: tokenResponse,
      user: userInfo,
    };
  }

  /**
   * Verify MFA code for super admin
   * @param email - Super admin email
   * @param mfaCode - MFA code
   * @returns Token response with user info
   */
  async verifyMfa(
    email: string,
    mfaCode: string,
  ): Promise<{ token: TokenResponseDto; user: UserInfoDto }> {
    const superAdmin = await this.superAdminRepository.findByEmail(email);

    if (!superAdmin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!superAdmin.mfaEnabled) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'MFA is not enabled for this account',
      );
    }

    // TODO: Implement MFA verification
    // For now, we'll throw an error indicating it's not implemented
    throw new BusinessException(
      ErrorCode.VALIDATION_ERROR,
      'MFA verification is not yet implemented',
    );
  }

  /**
   * Check if super admin account is locked
   * @param email - Super admin email
   * @returns True if account is locked
   */
  async isAccountLocked(email: string): Promise<boolean> {
    const superAdmin = await this.superAdminRepository.findByEmailIncludeInactive(email);

    if (!superAdmin) {
      return false;
    }

    return superAdmin.isAccountLocked();
  }

  /**
   * Get remaining login attempts before lockout
   * @param email - Super admin email
   * @returns Number of remaining attempts
   */
  async getRemainingAttempts(email: string): Promise<number> {
    const superAdmin = await this.superAdminRepository.findByEmailIncludeInactive(email);

    if (!superAdmin) {
      return 0;
    }

    if (superAdmin.isAccountLocked()) {
      return 0;
    }

    return Math.max(0, this.MAX_FAILED_ATTEMPTS - superAdmin.failedLoginAttempts);
  }
}
