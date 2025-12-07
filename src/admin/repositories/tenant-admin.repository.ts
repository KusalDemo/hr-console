import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TenantAdmin } from '../entities/tenant-admin.entity';
import { Tenant } from '../entities/tenant.entity';

/**
 * Tenant Admin Repository
 * Provides custom queries for tenant admin operations
 */
@Injectable()
export class TenantAdminRepository extends Repository<TenantAdmin> {
  constructor(private dataSource: DataSource) {
    super(TenantAdmin, dataSource.createEntityManager());
  }

  /**
   * Find tenant admin by email and tenant key (case-insensitive)
   * Only returns active tenant admins
   */
  async findByEmailAndTenant(email: string, tenantKey: string): Promise<TenantAdmin | null> {
    return this.findOne({
      where: {
        email: email.trim().toLowerCase(),
        isActive: true,
        tenant: {
          tenantKey: tenantKey.toLowerCase(),
          isActive: true,
        },
      },
      relations: ['tenant'],
    });
  }

  /**
   * Find tenant admin by email and tenant ID
   * Only returns active tenant admins
   */
  async findByEmailAndTenantId(email: string, tenantId: number): Promise<TenantAdmin | null> {
    return this.findOne({
      where: {
        email: email.trim().toLowerCase(),
        isActive: true,
        tenant: {
          id: tenantId,
          isActive: true,
        },
      },
      relations: ['tenant'],
    });
  }

  /**
   * Find tenant admin by email (across all tenants)
   * Only returns active tenant admins
   */
  async findByEmail(email: string): Promise<TenantAdmin | null> {
    return this.findOne({
      where: {
        email: email.trim().toLowerCase(),
        isActive: true,
      },
      relations: ['tenant'],
    });
  }

  /**
   * Find tenant admin by email including inactive accounts
   * Used for account management operations
   */
  async findByEmailIncludeInactive(email: string): Promise<TenantAdmin | null> {
    return this.findOne({
      where: {
        email: email.trim().toLowerCase(),
      },
      relations: ['tenant'],
    });
  }

  /**
   * Find tenant admin by tenant key
   * Returns the first active tenant admin for the given tenant
   */
  async findByTenantKey(tenantKey: string): Promise<TenantAdmin | null> {
    return this.findOne({
      where: {
        isActive: true,
        tenant: {
          tenantKey: tenantKey.toLowerCase(),
          isActive: true,
        },
      },
      relations: ['tenant'],
      order: {
        createdAt: 'ASC',
      },
    });
  }

  /**
   * Find all tenant admins for a specific tenant
   */
  async findByTenantId(tenantId: number): Promise<TenantAdmin[]> {
    return this.find({
      where: {
        tenant: {
          id: tenantId,
        },
      },
      relations: ['tenant'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find active tenant admins for a specific tenant
   */
  async findActiveByTenantId(tenantId: number): Promise<TenantAdmin[]> {
    return this.find({
      where: {
        isActive: true,
        tenant: {
          id: tenantId,
          isActive: true,
        },
      },
      relations: ['tenant'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find tenant admin by ID
   */
  async findById(id: number): Promise<TenantAdmin | null> {
    return this.findOne({
      where: {
        id,
      },
      relations: ['tenant'],
    });
  }

  /**
   * Find active tenant admin by ID
   */
  async findActiveById(id: number): Promise<TenantAdmin | null> {
    return this.findOne({
      where: {
        id,
        isActive: true,
      },
      relations: ['tenant'],
    });
  }

  /**
   * Lock tenant admin account
   * Sets isLocked to true and optionally sets lockedUntil timestamp
   */
  async lockAccount(id: number, lockedUntil?: Date): Promise<void> {
    await this.update(id, {
      isLocked: true,
      lockedUntil: lockedUntil || null,
    });
  }

  /**
   * Unlock tenant admin account
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
  async updatePassword(id: number, passwordHash: string, expiresAt?: Date): Promise<void> {
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
   * Activate tenant admin account
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
   * Deactivate tenant admin account
   */
  async deactivateAccount(id: number): Promise<void> {
    await this.update(id, {
      isActive: false,
    });
  }

  /**
   * Enable MFA for tenant admin
   */
  async enableMfa(id: number): Promise<void> {
    await this.update(id, {
      mfaEnabled: true,
    });
  }

  /**
   * Disable MFA for tenant admin
   */
  async disableMfa(id: number): Promise<void> {
    await this.update(id, {
      mfaEnabled: false,
    });
  }

  /**
   * Create tenant admin with tenant relationship
   */
  async createWithTenant(
    tenant: Tenant,
    email: string,
    passwordHash: string,
    fullName: string,
  ): Promise<TenantAdmin> {
    const tenantAdmin = this.create({
      tenant,
      email: email.trim().toLowerCase(),
      passwordHash,
      fullName,
      isActive: true,
    });

    return this.save(tenantAdmin);
  }
}
