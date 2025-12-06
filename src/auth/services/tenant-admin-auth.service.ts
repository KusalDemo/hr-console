import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantAdminRepository } from '../../admin/repositories/tenant-admin.repository';
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
 * Tenant Admin Authentication Service
 * Handles authentication for tenant administrators
 * - Tenant validation
 * - Account lockout: 5 failed attempts, 30 minute lockout
 * - Failed login attempt tracking
 * - Organization selection logic
 * - Tenant user role integration
 */
@Injectable()
export class TenantAdminAuthService {
  private readonly logger = new Logger(TenantAdminAuthService.name);
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 30;

  constructor(
    private readonly tenantAdminRepository: TenantAdminRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly multiTenantService: MultiTenantService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Authenticate tenant admin
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

    // Generate hash for received password first (for debug log)
    const receivedPasswordHash = await this.passwordService.hashPassword(loginDto.password);

    // Validate tenant exists and is active
    const tenantAdmin = await this.tenantAdminRepository.findByEmailAndTenant(
      email,
      normalizedTenantKey,
    );

    // Check if tenant exists at all
    const tenantExists = await this.dataSource.query(
      `SELECT id, tenant_key, name, is_active FROM admin.tenants WHERE tenant_key = $1`,
      [normalizedTenantKey],
    );

    // Check if any tenant admin exists for this tenant
    const tenantAdmins = await this.dataSource.query(
      `SELECT id, email, is_active, password_hash, tenant_id FROM admin.tenant_admin WHERE tenant_id = (SELECT id FROM admin.tenants WHERE tenant_key = $1)`,
      [normalizedTenantKey],
    );

    // Get stored hash from DB directly if tenant admin not found via repository
    let storedPasswordHash = 'NOT FOUND';
    if (tenantAdmin) {
      storedPasswordHash = tenantAdmin.passwordHash;
    } else if (tenantAdmins.length > 0) {
      // Find matching email
      const matchingAdmin = tenantAdmins.find((ta: any) => ta.email.toLowerCase() === email);
      if (matchingAdmin) {
        storedPasswordHash = matchingAdmin.password_hash;
      }
    }

    // DEBUG LOGGING - COMPREHENSIVE SINGLE LOG - Remove in production
    this.logger.log(`[DEBUG] ========== TENANT ADMIN LOGIN DEBUG ==========`);
    this.logger.log(`[DEBUG] Tenant: ${normalizedTenantKey}`);
    this.logger.log(`[DEBUG] Email: ${email}`);
    this.logger.log(`[DEBUG] Received Password (PLAIN TEXT): ${loginDto.password}`);
    this.logger.log(`[DEBUG] Received Password Hash (NEW): ${receivedPasswordHash}`);
    this.logger.log(`[DEBUG] Stored Password Hash (DB): ${storedPasswordHash}`);
    this.logger.log(`[DEBUG] Tenant Admin Found: ${tenantAdmin ? 'YES' : 'NO'}`);
    this.logger.log(`[DEBUG] Tenant Exists: ${tenantExists.length > 0 ? 'YES' : 'NO'}`);
    if (tenantExists.length > 0) {
      this.logger.log(`[DEBUG] Tenant Details: ${JSON.stringify(tenantExists[0])}`);
    }
    this.logger.log(`[DEBUG] Tenant Admins in DB: ${tenantAdmins.length}`);
    if (tenantAdmins.length > 0) {
      this.logger.log(`[DEBUG] Tenant Admins: ${JSON.stringify(tenantAdmins.map((ta: any) => ({ id: ta.id, email: ta.email, is_active: ta.is_active })))}`);
    }
    if (tenantAdmin) {
      this.logger.log(`[DEBUG] Tenant Admin ID: ${tenantAdmin.id}`);
      this.logger.log(`[DEBUG] Tenant Admin isActive: ${tenantAdmin.isActive}`);
      this.logger.log(`[DEBUG] Tenant isActive: ${tenantAdmin.tenant.isActive}`);
    }
    this.logger.log(`[DEBUG] ===============================================`);

    if (!tenantAdmin) {
      // Don't reveal if user exists or not (security best practice)
      throw new UnauthorizedException('Invalid email or password');
    }

    // Validate tenant is active
    if (!tenantAdmin.tenant.isActive) {
      throw new BusinessException(
        ErrorCode.TENANT_INACTIVE,
        'Tenant is inactive. Please contact administrator.',
      );
    }

    // Check if account is active
    if (!tenantAdmin.isActive) {
      throw new BusinessException(
        ErrorCode.ACCOUNT_LOCKED,
        'Account is inactive. Please contact administrator.',
      );
    }

    // Check if account is locked
    if (tenantAdmin.isAccountLocked()) {
      const lockoutMessage = tenantAdmin.lockedUntil
        ? `Account is locked until ${tenantAdmin.lockedUntil.toISOString()}. Please try again later.`
        : 'Account is locked. Please contact administrator.';

      throw new BusinessException(ErrorCode.ACCOUNT_LOCKED, lockoutMessage);
    }

    // Validate password
    let isPasswordValid = false;
    try {
      isPasswordValid = await this.passwordService.verifyPassword(
        loginDto.password,
        tenantAdmin.passwordHash,
      );
      
      // DEBUG LOGGING - Remove in production
      this.logger.log(`[DEBUG] Password verification result: ${isPasswordValid}`);
    } catch (error) {
      this.logger.error(`[DEBUG] Password verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }

    if (!isPasswordValid) {
      // Increment failed login attempts
      await this.tenantAdminRepository.incrementFailedLoginAttempts(tenantAdmin.id);

      // Reload to get updated failed attempts count
      const updatedAdmin = await this.tenantAdminRepository.findById(tenantAdmin.id);
      if (!updatedAdmin) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Check if account should be locked
      if (updatedAdmin.failedLoginAttempts >= this.MAX_FAILED_ATTEMPTS) {
        const lockoutUntil = new Date();
        lockoutUntil.setMinutes(lockoutUntil.getMinutes() + this.LOCKOUT_DURATION_MINUTES);

        await this.tenantAdminRepository.lockAccount(updatedAdmin.id, lockoutUntil);

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
    if (tenantAdmin.isPasswordExpired()) {
      await this.tenantAdminRepository.requirePasswordChange(tenantAdmin.id);
      throw new BusinessException(
        ErrorCode.UNAUTHORIZED,
        'Password has expired. Please change your password.',
      );
    }

    // Check if password change is required
    if (tenantAdmin.requiresPasswordChange) {
      throw new BusinessException(
        ErrorCode.UNAUTHORIZED,
        'Password change is required. Please change your password before logging in.',
      );
    }

    // Handle MFA if enabled
    if (tenantAdmin.mfaEnabled) {
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
    await this.tenantAdminRepository.resetFailedLoginAttempts(tenantAdmin.id);

    // Unlock account if it was locked (in case lockout period expired)
    if (tenantAdmin.isLocked && !tenantAdmin.isAccountLocked()) {
      await this.tenantAdminRepository.unlockAccount(tenantAdmin.id);
    }

    // Get tenant user roles if user exists in tenant schema
    const tenantRoles = await this.getTenantUserRoles(normalizedTenantKey, email);

    // Build roles array - always include ROLE_TENANT_ADMIN
    const roles = ['ROLE_TENANT_ADMIN', ...tenantRoles];

    // Handle organization selection
    let organizationId: number | undefined;
    let organizationIds: number[] | undefined;

    if (loginDto.organizationId) {
      // Validate organization access
      const orgId = parseInt(loginDto.organizationId, 10);
      if (!isNaN(orgId)) {
        // TODO: Validate user has access to this organization
        // This will be implemented when organization management is complete
        organizationId = orgId;
      }
    }

    // Get all organizations user belongs to (if available)
    // TODO: Implement organization membership lookup
    // This will be implemented when organization management is complete

    // Generate tokens
    const tokenPair = this.tokenService.generateTokenPair({
      userId: tenantAdmin.id,
      email: tenantAdmin.email,
      fullName: tenantAdmin.fullName,
      roles,
      tenant: normalizedTenantKey,
      organizationId,
      organizationIds,
      userType: 'TENANT_ADMIN',
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
      userId: tenantAdmin.id,
      email: tenantAdmin.email,
      fullName: tenantAdmin.fullName,
      roles,
      tenant: normalizedTenantKey,
      organizationId,
      organizationIds,
      userType: 'TENANT_ADMIN',
    };

    return {
      token: tokenResponse,
      user: userInfo,
    };
  }

  /**
   * Get tenant user roles from tenant schema
   * If user exists in tenant schema, get their roles
   * @param tenantKey - Tenant key
   * @param email - User email
   * @returns Array of role names with ROLE_ prefix
   */
  private async getTenantUserRoles(tenantKey: string, email: string): Promise<string[]> {
    try {
      const schemaName = this.multiTenantService.getTenantSchemaName(tenantKey);

      // Check if schema exists
      const schemaExists = await this.multiTenantService.schemaExists(schemaName);
      if (!schemaExists) {
        return [];
      }

      // Check if users table exists
      const hasUsersTable = await this.multiTenantService.validateSchemaTables(schemaName, [
        'users',
      ]);
      if (!hasUsersTable) {
        return [];
      }

      // Query tenant schema for user roles
      // Use quoted schema name to prevent SQL injection
      const quotedSchema = `"${schemaName.replace(/"/g, '""')}"`;
      const query = `
        SELECT r.name
        FROM ${quotedSchema}.users u
        INNER JOIN ${quotedSchema}.user_roles ur ON u.id = ur.user_id
        INNER JOIN ${quotedSchema}.roles r ON ur.role_id = r.id
        WHERE u.email = $1 AND u.active = true
      `;

      const result = await this.dataSource.query(query, [email]);

      // Map role names to ROLE_ prefixed format
      return result.map((row: { name: string }) => `ROLE_${row.name.toUpperCase()}`);
    } catch (error) {
      // If tenant schema doesn't exist or query fails, return empty array
      // This is expected for newly created tenants that haven't been fully initialized
      return [];
    }
  }

  /**
   * Verify MFA code for tenant admin
   * @param tenantKey - Tenant key
   * @param email - Tenant admin email
   * @param mfaCode - MFA code
   * @returns Token response with user info
   */
  async verifyMfa(
    tenantKey: string,
    email: string,
    mfaCode: string,
  ): Promise<{ token: TokenResponseDto; user: UserInfoDto }> {
    const normalizedTenantKey = tenantKey.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    const tenantAdmin = await this.tenantAdminRepository.findByEmailAndTenant(
      normalizedEmail,
      normalizedTenantKey,
    );

    if (!tenantAdmin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!tenantAdmin.mfaEnabled) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        'MFA is not enabled for this account',
      );
    }

    // TODO: Implement MFA verification
    throw new BusinessException(
      ErrorCode.VALIDATION_ERROR,
      'MFA verification is not yet implemented',
    );
  }

  /**
   * Check if tenant admin account is locked
   * @param tenantKey - Tenant key
   * @param email - Tenant admin email
   * @returns True if account is locked
   */
  async isAccountLocked(tenantKey: string, email: string): Promise<boolean> {
    const tenantAdmin = await this.tenantAdminRepository.findByEmailAndTenant(
      email.trim().toLowerCase(),
      tenantKey.trim().toLowerCase(),
    );

    if (!tenantAdmin) {
      return false;
    }

    return tenantAdmin.isAccountLocked();
  }

  /**
   * Get remaining login attempts before lockout
   * @param tenantKey - Tenant key
   * @param email - Tenant admin email
   * @returns Number of remaining attempts
   */
  async getRemainingAttempts(tenantKey: string, email: string): Promise<number> {
    const tenantAdmin = await this.tenantAdminRepository.findByEmailAndTenant(
      email.trim().toLowerCase(),
      tenantKey.trim().toLowerCase(),
    );

    if (!tenantAdmin) {
      return 0;
    }

    if (tenantAdmin.isAccountLocked()) {
      return 0;
    }

    return Math.max(0, this.MAX_FAILED_ATTEMPTS - tenantAdmin.failedLoginAttempts);
  }
}

