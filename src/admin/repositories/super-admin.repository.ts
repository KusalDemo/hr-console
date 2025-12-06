import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SuperAdmin } from '../entities/super-admin.entity';

/**
 * Super Admin Repository
 * Provides custom queries for super admin operations
 */
@Injectable()
export class SuperAdminRepository extends Repository<SuperAdmin> {
  constructor(private dataSource: DataSource) {
    super(SuperAdmin, dataSource.createEntityManager());
  }

  /**
   * Find super admin by email (case-insensitive)
   * Only returns active super admins
   */
  async findByEmail(email: string): Promise<SuperAdmin | null> {
    return this.findOne({
      where: {
        email: email.trim().toLowerCase(),
        isActive: true,
      },
    });
  }

  /**
   * Find super admin by email including inactive accounts
   * Used for account management operations
   */
  async findByEmailIncludeInactive(email: string): Promise<SuperAdmin | null> {
    return this.findOne({
      where: {
        email: email.trim().toLowerCase(),
      },
    });
  }

  /**
   * Find super admin by ID
   */
  async findById(id: number): Promise<SuperAdmin | null> {
    return this.findOne({
      where: {
        id,
      },
    });
  }

  /**
   * Find active super admin by ID
   */
  async findActiveById(id: number): Promise<SuperAdmin | null> {
    return this.findOne({
      where: {
        id,
        isActive: true,
      },
    });
  }

  /**
   * Find all active super admins
   */
  async findAllActive(): Promise<SuperAdmin[]> {
    return this.find({
      where: {
        isActive: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Lock super admin account
   * Sets isLocked to true and optionally sets lockedUntil timestamp
   */
  async lockAccount(
    id: number,
    lockedUntil?: Date,
  ): Promise<void> {
    await this.update(id, {
      isLocked: true,
      lockedUntil: lockedUntil || null,
    });
  }

  /**
   * Unlock super admin account
   * Resets lock status and failed login attempts
   */
  async unlockAccount(id: number): Promise<void> {
    await this.update(id, {
      isLocked: false,
      lockedUntil: null,
      failedLoginAttempts: 0,
    });
  }

  /**
   * Increment failed login attempts
   * Also updates last_failed_login_at timestamp
   */
  async incrementFailedLoginAttempts(id: number): Promise<void> {
    const admin = await this.findById(id);
    if (!admin) {
      return;
    }

    const newAttempts = admin.failedLoginAttempts + 1;
    await this.update(id, {
      failedLoginAttempts: newAttempts,
      lastFailedLoginAt: new Date(),
    });
  }

  /**
   * Reset failed login attempts
   * Called after successful login
   */
  async resetFailedLoginAttempts(id: number): Promise<void> {
    await this.update(id, {
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
    });
  }

  /**
   * Update password and related fields
   */
  async updatePassword(
    id: number,
    passwordHash: string,
    expiresAt?: Date,
  ): Promise<void> {
    await this.update(id, {
      passwordHash,
      passwordChangedAt: new Date(),
      passwordExpiresAt: expiresAt || null,
      requiresPasswordChange: false,
    });
  }

  /**
   * Mark password change as required
   */
  async requirePasswordChange(id: number): Promise<void> {
    await this.update(id, {
      requiresPasswordChange: true,
    });
  }

  /**
   * Activate super admin account
   */
  async activateAccount(id: number): Promise<void> {
    await this.update(id, {
      isActive: true,
      isLocked: false,
      lockedUntil: null,
      failedLoginAttempts: 0,
    });
  }

  /**
   * Deactivate super admin account
   */
  async deactivateAccount(id: number): Promise<void> {
    await this.update(id, {
      isActive: false,
    });
  }

  /**
   * Enable MFA for super admin
   */
  async enableMfa(id: number): Promise<void> {
    await this.update(id, {
      mfaEnabled: true,
    });
  }

  /**
   * Disable MFA for super admin
   */
  async disableMfa(id: number): Promise<void> {
    await this.update(id, {
      mfaEnabled: false,
    });
  }
}

