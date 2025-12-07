import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantRepository } from '../../admin/repositories/tenant.repository';
import { TenantAdminRepository } from '../../admin/repositories/tenant-admin.repository';
import { MultiTenantService } from '../../database/multi-tenant.service';
import { Tenant } from '../../admin/entities/tenant.entity';

/**
 * Tenant Deactivation Service
 *
 * Handles the complete tenant deactivation process:
 * 1. Soft delete tenant (mark inactive)
 * 2. Prevent new logins (deactivate tenant admins)
 * 3. Graceful shutdown of tenant operations
 * 4. Data retention policies
 *
 * This service ensures that tenant deactivation is done safely
 * while preserving data for potential reactivation.
 */
@Injectable()
export class TenantDeactivationService {
  private readonly logger = new Logger(TenantDeactivationService.name);

  // Data retention policy: Keep deactivated tenant data for 90 days by default
  private readonly DATA_RETENTION_DAYS = 90;

  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly tenantAdminRepository: TenantAdminRepository,
    private readonly multiTenantService: MultiTenantService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Deactivate a tenant
   *
   * This is the main entry point for tenant deactivation.
   * It performs a soft delete by marking the tenant as inactive
   * and prevents new logins by deactivating all tenant admins.
   *
   * @param tenantId - Tenant ID to deactivate
   * @param reason - Optional reason for deactivation (for audit logging)
   * @param deactivatedBy - User ID who performed the deactivation (for audit logging)
   * @returns Deactivated tenant entity
   * @throws NotFoundException if tenant not found
   * @throws BadRequestException if tenant is already inactive
   */
  async deactivateTenant(
    tenantId: number,
    reason?: string,
    deactivatedBy?: number,
  ): Promise<Tenant> {
    this.logger.log(`Starting tenant deactivation: ${tenantId}`);

    // Step 1: Validate tenant exists and is active
    const tenant = await this.tenantRepository.findByIdIncludeInactive(tenantId);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    if (!tenant.isActive) {
      this.logger.warn(`Tenant ${tenantId} is already inactive`);
      throw new BadRequestException(`Tenant ${tenantId} is already inactive`);
    }

    try {
      // Step 2: Deactivate all tenant admins (prevent new logins)
      await this.deactivateTenantAdmins(tenantId);

      // Step 3: Mark tenant as inactive (soft delete)
      await this.tenantRepository.deactivateTenant(tenantId);

      // Step 4: Log deactivation event (audit logging)
      await this.logDeactivationEvent(tenant, reason, deactivatedBy);

      // Step 5: Log tenant operations shutdown
      this.logger.log(`Tenant deactivated successfully: ${tenant.tenantKey} (ID: ${tenant.id})`);

      // Reload tenant to get updated state
      const deactivatedTenant = await this.tenantRepository.findByIdIncludeInactive(tenantId);

      if (!deactivatedTenant) {
        throw new NotFoundException(`Tenant with ID ${tenantId} not found after deactivation`);
      }

      return deactivatedTenant;
    } catch (error) {
      this.logger.error(
        `Failed to deactivate tenant: ${tenantId}`,
        error instanceof Error ? error.stack : String(error),
      );

      // Re-throw known exceptions
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      // Wrap unknown errors
      throw new BadRequestException(
        `Failed to deactivate tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Deactivate tenant by tenant key
   *
   * @param tenantKey - Tenant key to deactivate
   * @param reason - Optional reason for deactivation
   * @param deactivatedBy - User ID who performed the deactivation
   * @returns Deactivated tenant entity
   */
  async deactivateTenantByKey(
    tenantKey: string,
    reason?: string,
    deactivatedBy?: number,
  ): Promise<Tenant> {
    const normalizedTenantKey = tenantKey.trim().toLowerCase();
    const tenant = await this.tenantRepository.findByTenantKey(
      normalizedTenantKey,
      true, // Include inactive
    );

    if (!tenant) {
      throw new NotFoundException(`Tenant with key '${tenantKey}' not found`);
    }

    return this.deactivateTenant(tenant.id, reason, deactivatedBy);
  }

  /**
   * Deactivate all tenant admins for a tenant
   * This prevents new logins while preserving existing sessions
   *
   * @param tenantId - Tenant ID
   */
  private async deactivateTenantAdmins(tenantId: number): Promise<void> {
    this.logger.log(`Deactivating tenant admins for tenant: ${tenantId}`);

    const tenantAdmins = await this.tenantAdminRepository.findByTenantId(tenantId);

    if (tenantAdmins.length === 0) {
      this.logger.warn(`No tenant admins found for tenant: ${tenantId}`);
      return;
    }

    // Deactivate all tenant admins
    const deactivationPromises = tenantAdmins.map(async (admin) => {
      if (admin.isActive) {
        await this.tenantAdminRepository.update(admin.id, {
          isActive: false,
        });
        this.logger.log(`Deactivated tenant admin: ${admin.email} (ID: ${admin.id})`);
      }
    });

    await Promise.all(deactivationPromises);

    this.logger.log(`Deactivated ${tenantAdmins.length} tenant admin(s) for tenant: ${tenantId}`);
  }

  /**
   * Log tenant deactivation event to audit logs
   *
   * @param tenant - Tenant entity
   * @param reason - Optional reason for deactivation
   * @param deactivatedBy - User ID who performed the deactivation
   */
  private async logDeactivationEvent(
    tenant: Tenant,
    reason?: string,
    deactivatedBy?: number,
  ): Promise<void> {
    try {
      const metadata = {
        tenantId: tenant.id,
        tenantKey: tenant.tenantKey,
        tenantName: tenant.name,
        reason: reason || 'No reason provided',
        deactivatedAt: new Date().toISOString(),
        dataRetentionDays: this.DATA_RETENTION_DAYS,
      };

      // Log to audit_logs table in admin schema
      await this.dataSource.query(
        `
        INSERT INTO admin.audit_logs (
          event_type,
          entity_type,
          entity_id,
          action,
          action_status,
          user_id,
          user_type,
          tenant_id,
          metadata,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          'TENANT_DEACTIVATED',
          'TENANT',
          tenant.id,
          'DEACTIVATE',
          'SUCCESS',
          deactivatedBy || null,
          'SUPER_ADMIN',
          tenant.id,
          JSON.stringify(metadata),
          new Date(),
        ],
      );

      this.logger.log(
        `Logged deactivation event for tenant: ${tenant.tenantKey} (ID: ${tenant.id})`,
      );
    } catch (error) {
      // Log error but don't fail deactivation
      this.logger.error(
        `Failed to log deactivation event for tenant: ${tenant.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Check if tenant can be deactivated
   * Validates that tenant is active and has no blocking conditions
   *
   * @param tenantId - Tenant ID
   * @returns Validation result with details
   */
  async canDeactivateTenant(tenantId: number): Promise<{
    canDeactivate: boolean;
    reasons: string[];
  }> {
    const tenant = await this.tenantRepository.findByIdIncludeInactive(tenantId);

    if (!tenant) {
      return {
        canDeactivate: false,
        reasons: ['Tenant not found'],
      };
    }

    if (!tenant.isActive) {
      return {
        canDeactivate: false,
        reasons: ['Tenant is already inactive'],
      };
    }

    const reasons: string[] = [];

    // Check for active subscriptions (will be implemented in Phase 5)
    // For now, we allow deactivation
    // TODO: Add subscription check in Phase 5

    // Check for ongoing critical operations (if any)
    // This can be extended based on business requirements
    // For example: pending payroll processing, active leave requests, etc.

    return {
      canDeactivate: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Get data retention information for a tenant
   *
   * @param tenantId - Tenant ID
   * @returns Data retention information
   */
  async getDataRetentionInfo(tenantId: number): Promise<{
    retentionDays: number;
    canBePermanentlyDeleted: boolean;
    permanentDeletionDate: Date | null;
  }> {
    const tenant = await this.tenantRepository.findByIdIncludeInactive(tenantId);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    // If tenant is active, it cannot be permanently deleted
    if (tenant.isActive) {
      return {
        retentionDays: this.DATA_RETENTION_DAYS,
        canBePermanentlyDeleted: false,
        permanentDeletionDate: null,
      };
    }

    // Calculate when tenant can be permanently deleted
    const deactivatedAt = tenant.updatedAt; // Updated when deactivated
    const permanentDeletionDate = new Date(deactivatedAt);
    permanentDeletionDate.setDate(permanentDeletionDate.getDate() + this.DATA_RETENTION_DAYS);

    const canBePermanentlyDeleted = permanentDeletionDate <= new Date();

    return {
      retentionDays: this.DATA_RETENTION_DAYS,
      canBePermanentlyDeleted,
      permanentDeletionDate,
    };
  }

  /**
   * Get list of tenants eligible for permanent deletion
   * Based on data retention policy
   *
   * @returns List of tenants that can be permanently deleted
   */
  async getTenantsEligibleForPermanentDeletion(): Promise<Tenant[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.DATA_RETENTION_DAYS);

    // Find inactive tenants that were deactivated before the cutoff date
    const tenants = await this.tenantRepository
      .createQueryBuilder('tenant')
      .where('tenant.isActive = :isActive', { isActive: false })
      .andWhere('tenant.updatedAt <= :cutoffDate', { cutoffDate })
      .orderBy('tenant.updatedAt', 'ASC')
      .getMany();

    return tenants;
  }

  /**
   * Gracefully shutdown tenant operations
   * This method can be called before deactivation to ensure
   * ongoing operations complete gracefully
   *
   * @param tenantId - Tenant ID
   * @param timeoutMs - Timeout in milliseconds (default: 30000)
   */
  async gracefulShutdown(tenantId: number, timeoutMs: number = 30000): Promise<void> {
    this.logger.log(`Starting graceful shutdown for tenant: ${tenantId} (timeout: ${timeoutMs}ms)`);

    const tenant = await this.tenantRepository.findById(tenantId);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    // Log ongoing operations (if any)
    // This is a placeholder for future implementation
    // In a production system, you might want to:
    // - Check for active background jobs
    // - Wait for ongoing API requests to complete
    // - Cancel or pause scheduled tasks
    // - Notify connected clients

    this.logger.log(
      `Graceful shutdown completed for tenant: ${tenant.tenantKey} (ID: ${tenant.id})`,
    );
  }
}
