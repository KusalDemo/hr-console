import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { MultiTenantService } from '../../database/multi-tenant.service';
import { LoginDto } from '../dto/login.dto';
import { TokenResponseDto, UserInfoDto } from '../dto/token-response.dto';
import {
  BusinessException,
  UnauthorizedException,
  ErrorCode,
} from '../../common/exceptions/business.exception';

/**
 * User Authentication Service
 * Handles authentication for regular users in tenant schemas
 * - Organization context resolution
 * - Role-based access preparation
 * - Account lockout handling
 * - Session management
 */
@Injectable()
export class UserAuthService {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 30;

  constructor(
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly multiTenantService: MultiTenantService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Authenticate user in tenant schema
   * @param tenantKey - Tenant key from X-Tenant header
   * @param loginDto - Login credentials
   * @param ipAddress - Client IP address (for logging)
   * @param userAgent - Client user agent (for logging)
   * @returns Token response with user info
   * @throws UnauthorizedException if authentication fails
   */
  async login(
    tenantKey: string,
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ token: TokenResponseDto; user: UserInfoDto }> {
    const normalizedTenantKey = tenantKey.trim().toLowerCase();
    const email = loginDto.email.trim().toLowerCase();
    const schemaName = this.multiTenantService.getTenantSchemaName(normalizedTenantKey);

    // Validate tenant schema exists
    const schemaExists = await this.multiTenantService.schemaExists(schemaName);
    if (!schemaExists) {
      throw new BusinessException(
        ErrorCode.TENANT_NOT_FOUND,
        'Tenant schema not found. Please contact administrator.',
      );
    }

    // Validate users table exists
    const hasUsersTable = await this.multiTenantService.validateSchemaTables(schemaName, [
      'users',
    ]);
    if (!hasUsersTable) {
      throw new BusinessException(
        ErrorCode.TENANT_NOT_FOUND,
        'Tenant schema is not properly initialized. Please contact administrator.',
      );
    }

    // Find user in tenant schema
    const user = await this.findUserInTenantSchema(schemaName, email);

    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is active
    if (!user.active) {
      throw new BusinessException(
        ErrorCode.ACCOUNT_LOCKED,
        'Account is inactive. Please contact administrator.',
      );
    }

    // Check if account is locked
    if (this.isAccountLocked(user)) {
      const lockoutMessage = user.locked_until
        ? `Account is locked until ${user.locked_until.toISOString()}. Please try again later.`
        : 'Account is locked. Please contact administrator.';

      throw new BusinessException(ErrorCode.ACCOUNT_LOCKED, lockoutMessage);
    }

    // Validate password
    const isPasswordValid = await this.passwordService.verifyPassword(
      loginDto.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      // Increment failed login attempts
      await this.incrementFailedLoginAttempts(schemaName, user.id);

      // Reload user to get updated failed attempts count
      const updatedUser = await this.findUserInTenantSchema(schemaName, email);
      if (!updatedUser) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Check if account should be locked
      if (updatedUser.failed_login_attempts >= this.MAX_FAILED_ATTEMPTS) {
        const lockoutUntil = new Date();
        lockoutUntil.setMinutes(lockoutUntil.getMinutes() + this.LOCKOUT_DURATION_MINUTES);

        await this.lockAccount(schemaName, updatedUser.id, lockoutUntil);

        throw new BusinessException(
          ErrorCode.ACCOUNT_LOCKED,
          `Account has been locked due to too many failed login attempts. Please try again after ${this.LOCKOUT_DURATION_MINUTES} minutes.`,
        );
      }

      // Calculate remaining attempts
      const remainingAttempts =
        this.MAX_FAILED_ATTEMPTS - updatedUser.failed_login_attempts;

      throw new UnauthorizedException(
        `Invalid email or password. ${remainingAttempts} attempt(s) remaining before account lockout.`,
      );
    }

    // Check if password has expired
    if (user.password_expires_at && new Date(user.password_expires_at) < new Date()) {
      await this.requirePasswordChange(schemaName, user.id);
      throw new BusinessException(
        ErrorCode.UNAUTHORIZED,
        'Password has expired. Please change your password.',
      );
    }

    // Check if password change is required
    if (user.requires_password_change) {
      throw new BusinessException(
        ErrorCode.UNAUTHORIZED,
        'Password change is required. Please change your password before logging in.',
      );
    }

    // Handle MFA if enabled
    if (user.mfa_enabled) {
      if (!loginDto.mfaCode) {
        throw new BusinessException(
          ErrorCode.UNAUTHORIZED,
          'Multi-factor authentication is required. Please provide MFA code.',
          undefined,
          { mfaRequired: true },
        );
      }

      // TODO: Verify MFA code
      // This will be implemented in a future commit
    }

    // Reset failed login attempts on successful login
    await this.resetFailedLoginAttempts(schemaName, user.id);

    // Unlock account if it was locked (in case lockout period expired)
    if (user.is_locked && !this.isAccountLocked(user)) {
      await this.unlockAccount(schemaName, user.id);
    }

    // Get user roles
    const roles = await this.getUserRoles(schemaName, user.id);

    // Resolve organization context
    const organizationContext = await this.resolveOrganizationContext(
      schemaName,
      user.id,
      loginDto.organizationId,
    );

    // Generate tokens
    const tokenPair = this.tokenService.generateTokenPair({
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      roles,
      tenant: normalizedTenantKey,
      organizationId: organizationContext.organizationId,
      organizationIds: organizationContext.organizationIds,
      userType: 'USER',
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
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      roles,
      tenant: normalizedTenantKey,
      organizationId: organizationContext.organizationId,
      organizationIds: organizationContext.organizationIds,
      userType: 'USER',
    };

    return {
      token: tokenResponse,
      user: userInfo,
    };
  }

  /**
   * Find user in tenant schema
   * @param schemaName - Tenant schema name
   * @param email - User email
   * @returns User data or null
   */
  private async findUserInTenantSchema(
    schemaName: string,
    email: string,
  ): Promise<{
    id: number;
    email: string;
    password_hash: string;
    full_name: string;
    active: boolean;
    is_locked: boolean;
    locked_until: Date | null;
    failed_login_attempts: number;
    last_failed_login_at: Date | null;
    requires_password_change: boolean;
    mfa_enabled: boolean;
    password_expires_at: Date | null;
  } | null> {
    try {
      const quotedSchema = `"${schemaName.replace(/"/g, '""')}"`;
      const query = `
        SELECT 
          id,
          email,
          password_hash,
          full_name,
          active,
          is_locked,
          locked_until,
          failed_login_attempts,
          last_failed_login_at,
          requires_password_change,
          mfa_enabled,
          password_expires_at
        FROM ${quotedSchema}.users
        WHERE email = $1
      `;

      const result = await this.dataSource.query(query, [email]);

      if (result.length === 0) {
        return null;
      }

      return result[0];
    } catch (error) {
      // If query fails, return null
      return null;
    }
  }

  /**
   * Get user roles from tenant schema
   * @param schemaName - Tenant schema name
   * @param userId - User ID
   * @returns Array of role names with ROLE_ prefix
   */
  private async getUserRoles(schemaName: string, userId: number): Promise<string[]> {
    try {
      const quotedSchema = `"${schemaName.replace(/"/g, '""')}"`;
      const query = `
        SELECT r.name
        FROM ${quotedSchema}.user_roles ur
        INNER JOIN ${quotedSchema}.roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
      `;

      const result = await this.dataSource.query(query, [userId]);

      // Map role names to ROLE_ prefixed format
      return result.map((row: { name: string }) => `ROLE_${row.name.toUpperCase()}`);
    } catch (error) {
      // If roles table doesn't exist or query fails, return empty array
      return [];
    }
  }

  /**
   * Resolve organization context for user
   * Priority: Request organizationId > Primary organization > Default organization
   * @param schemaName - Tenant schema name
   * @param userId - User ID
   * @param requestedOrganizationId - Organization ID from login request (optional)
   * @returns Organization context with organizationId and organizationIds
   */
  private async resolveOrganizationContext(
    schemaName: string,
    userId: number,
    requestedOrganizationId?: string,
  ): Promise<{ organizationId?: number; organizationIds?: number[] }> {
    try {
      const quotedSchema = `"${schemaName.replace(/"/g, '""')}"`;

      // Check if organization_memberships table exists
      const hasMembershipsTable = await this.multiTenantService.validateSchemaTables(
        schemaName,
        ['organization_memberships'],
      );

      if (!hasMembershipsTable) {
        // Organizations not yet implemented, return empty
        return {};
      }

      // Get all organization memberships for user
      const membershipsQuery = `
        SELECT organization_id, is_primary
        FROM ${quotedSchema}.organization_memberships
        WHERE user_id = $1 AND left_at IS NULL
        ORDER BY is_primary DESC, joined_at ASC
      `;

      const memberships = await this.dataSource.query(membershipsQuery, [userId]);

      if (memberships.length === 0) {
        return {};
      }

      const organizationIds = memberships.map(
        (m: { organization_id: number }) => m.organization_id,
      );

      // Determine primary organization
      let organizationId: number | undefined;

      // Priority 1: Requested organization ID (if user has access)
      if (requestedOrganizationId) {
        const requestedId = parseInt(requestedOrganizationId, 10);
        if (!isNaN(requestedId) && organizationIds.includes(requestedId)) {
          organizationId = requestedId;
        }
      }

      // Priority 2: Primary organization
      if (!organizationId) {
        const primaryMembership = memberships.find(
          (m: { is_primary: boolean }) => m.is_primary === true,
        );
        if (primaryMembership) {
          organizationId = primaryMembership.organization_id;
        }
      }

      // Priority 3: First organization (fallback)
      if (!organizationId && organizationIds.length > 0) {
        organizationId = organizationIds[0];
      }

      return {
        organizationId,
        organizationIds: organizationIds.length > 0 ? organizationIds : undefined,
      };
    } catch (error) {
      // If query fails, return empty
      return {};
    }
  }

  /**
   * Check if account is locked
   */
  private isAccountLocked(user: {
    is_locked: boolean;
    locked_until: Date | null;
  }): boolean {
    if (!user.is_locked) {
      return false;
    }

    // If locked_until is set and has passed, account is no longer locked
    if (user.locked_until && new Date(user.locked_until) < new Date()) {
      return false;
    }

    return user.is_locked;
  }

  /**
   * Increment failed login attempts
   */
  private async incrementFailedLoginAttempts(
    schemaName: string,
    userId: number,
  ): Promise<void> {
    const quotedSchema = `"${schemaName.replace(/"/g, '""')}"`;
    const query = `
      UPDATE ${quotedSchema}.users
      SET 
        failed_login_attempts = failed_login_attempts + 1,
        last_failed_login_at = NOW()
      WHERE id = $1
    `;

    await this.dataSource.query(query, [userId]);
  }

  /**
   * Reset failed login attempts
   */
  private async resetFailedLoginAttempts(schemaName: string, userId: number): Promise<void> {
    const quotedSchema = `"${schemaName.replace(/"/g, '""')}"`;
    const query = `
      UPDATE ${quotedSchema}.users
      SET 
        failed_login_attempts = 0,
        last_failed_login_at = NULL
      WHERE id = $1
    `;

    await this.dataSource.query(query, [userId]);
  }

  /**
   * Lock account
   */
  private async lockAccount(
    schemaName: string,
    userId: number,
    lockedUntil?: Date,
  ): Promise<void> {
    const quotedSchema = `"${schemaName.replace(/"/g, '""')}"`;
    const query = `
      UPDATE ${quotedSchema}.users
      SET 
        is_locked = true,
        locked_until = $2
      WHERE id = $1
    `;

    await this.dataSource.query(query, [userId, lockedUntil || null]);
  }

  /**
   * Unlock account
   */
  private async unlockAccount(schemaName: string, userId: number): Promise<void> {
    const quotedSchema = `"${schemaName.replace(/"/g, '""')}"`;
    const query = `
      UPDATE ${quotedSchema}.users
      SET 
        is_locked = false,
        locked_until = NULL,
        failed_login_attempts = 0
      WHERE id = $1
    `;

    await this.dataSource.query(query, [userId]);
  }

  /**
   * Require password change
   */
  private async requirePasswordChange(schemaName: string, userId: number): Promise<void> {
    const quotedSchema = `"${schemaName.replace(/"/g, '""')}"`;
    const query = `
      UPDATE ${quotedSchema}.users
      SET requires_password_change = true
      WHERE id = $1
    `;

    await this.dataSource.query(query, [userId]);
  }
}

