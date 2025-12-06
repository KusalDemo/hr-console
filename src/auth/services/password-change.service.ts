import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PasswordService } from './password.service';
import { TenantAdminRepository } from '../../admin/repositories/tenant-admin.repository';
import { MultiTenantService } from '../../database/multi-tenant.service';
import { UserRepository } from '../../users/repositories/user.repository';

/**
 * Password Change Service
 * Handles password changes for tenant admin users
 * Syncs password changes to both tenant schema and admin.tenant_admin table
 */
@Injectable()
export class PasswordChangeService {
  private readonly logger = new Logger(PasswordChangeService.name);

  constructor(
    private readonly passwordService: PasswordService,
    private readonly tenantAdminRepository: TenantAdminRepository,
    private readonly multiTenantService: MultiTenantService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Change password for tenant admin user
   * Updates password in both tenant schema and admin.tenant_admin table
   * 
   * @param tenantKey - Tenant key
   * @param email - User email
   * @param currentPassword - Current password
   * @param newPassword - New password
   * @returns Success message
   */
  async changeTenantAdminPassword(
    tenantKey: string,
    email: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const normalizedTenantKey = tenantKey.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    this.logger.log(`Changing password for tenant admin: ${normalizedEmail} in tenant ${normalizedTenantKey}`);

    // Step 1: Find tenant admin in admin schema
    const tenantAdmin = await this.tenantAdminRepository.findByEmailAndTenant(
      normalizedEmail,
      normalizedTenantKey,
    );

    if (!tenantAdmin) {
      throw new NotFoundException('Tenant admin not found');
    }

    // Step 2: Verify current password
    const isCurrentPasswordValid = await this.passwordService.verifyPassword(
      currentPassword,
      tenantAdmin.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Step 3: Validate new password strength
    const validationResult = this.passwordService.validatePasswordStrength(newPassword);
    if (!validationResult.isValid) {
      throw new BadRequestException(
        `New password does not meet requirements: ${validationResult.errors.join(', ')}`,
      );
    }

    // Step 4: Hash new password
    const newPasswordHash = await this.passwordService.hashPassword(newPassword);

    // Step 5: Update password in admin.tenant_admin table
    await this.tenantAdminRepository.updatePassword(tenantAdmin.id, newPasswordHash);

    this.logger.log(`Updated password in admin.tenant_admin for ${normalizedEmail}`);

    // Step 6: Update password in tenant schema users table
    const schemaName = this.multiTenantService.getTenantSchemaName(normalizedTenantKey);
    const schemaExists = await this.multiTenantService.schemaExists(schemaName);

    if (schemaExists) {
      const tenantManager = await this.multiTenantService.getEntityManagerForSchema(schemaName);

      // Find user in tenant schema
      const userResult = await tenantManager.query(
        `SELECT id FROM users WHERE email = $1`,
        [normalizedEmail],
      );

      if (userResult.length > 0) {
        const userId = userResult[0].id;

        // Update password in tenant schema
        await tenantManager.query(
          `UPDATE users 
           SET password_hash = $1, password_changed_at = now(), requires_password_change = false 
           WHERE id = $2`,
          [newPasswordHash, userId],
        );

        this.logger.log(`Updated password in tenant schema for user ${userId}`);
      } else {
        this.logger.warn(`User not found in tenant schema: ${normalizedEmail}`);
      }
    } else {
      this.logger.warn(`Tenant schema does not exist: ${schemaName}`);
    }

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  /**
   * Change password for regular user (in tenant schema only)
   * 
   * @param tenantKey - Tenant key
   * @param email - User email
   * @param currentPassword - Current password
   * @param newPassword - New password
   * @returns Success message
   */
  async changeUserPassword(
    tenantKey: string,
    email: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    const normalizedTenantKey = tenantKey.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    this.logger.log(`Changing password for user: ${normalizedEmail} in tenant ${normalizedTenantKey}`);

    const schemaName = this.multiTenantService.getTenantSchemaName(normalizedTenantKey);
    const schemaExists = await this.multiTenantService.schemaExists(schemaName);

    if (!schemaExists) {
      throw new NotFoundException('Tenant schema not found');
    }

    const tenantManager = await this.multiTenantService.getEntityManagerForSchema(schemaName);

    // Find user in tenant schema
    const userResult = await tenantManager.query(
      `SELECT id, password_hash FROM users WHERE email = $1`,
      [normalizedEmail],
    );

    if (userResult.length === 0) {
      throw new NotFoundException('User not found');
    }

    const user = userResult[0];

    // Verify current password
    const isCurrentPasswordValid = await this.passwordService.verifyPassword(
      currentPassword,
      user.password_hash,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Validate new password strength
    const validationResult = this.passwordService.validatePasswordStrength(newPassword);
    if (!validationResult.isValid) {
      throw new BadRequestException(
        `New password does not meet requirements: ${validationResult.errors.join(', ')}`,
      );
    }

    // Hash new password
    const newPasswordHash = await this.passwordService.hashPassword(newPassword);

    // Update password in tenant schema
    await tenantManager.query(
      `UPDATE users 
       SET password_hash = $1, password_changed_at = now(), requires_password_change = false 
       WHERE id = $2`,
      [newPasswordHash, user.id],
    );

    this.logger.log(`Updated password in tenant schema for user ${user.id}`);

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }
}

