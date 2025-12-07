import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantRepository } from '../../admin/repositories/tenant.repository';
import { TenantAdminRepository } from '../../admin/repositories/tenant-admin.repository';
import { MultiTenantService } from '../../database/multi-tenant.service';
import { Tenant } from '../../admin/entities/tenant.entity';

/**
 * Tenant Reactivation Service
 *
 * Handles the complete tenant reactivation process:
 * 1. Reactivate deactivated tenant
 * 2. Validate subscription (if applicable)
 * 3. Restore access (reactivate tenant admins)
 * 4. Audit logging
 *
 * This service ensures that tenant reactivation is done safely
 * with proper validation and access restoration.
 */
@Injectable()
export class TenantReactivationService {
  private readonly logger = new Logger(TenantReactivationService.name);

  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly tenantAdminRepository: TenantAdminRepository,
    private readonly multiTenantService: MultiTenantService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Reactivate a tenant
   *
   * This is the main entry point for tenant reactivation.
   * It reactivates the tenant and restores access by reactivating tenant admins.
   *
   * @param tenantId - Tenant ID to reactivate
   * @param reason - Optional reason for reactivation (for audit logging)
   * @param reactivatedBy - User ID who performed the reactivation (for audit logging)
   * @returns Reactivated tenant entity
   * @throws NotFoundException if tenant not found
   * @throws BadRequestException if tenant is already active or cannot be reactivated
   */
  async reactivateTenant(
    tenantId: number,
    reason?: string,
    reactivatedBy?: number,
  ): Promise<Tenant> {
    this.logger.log(`Starting tenant reactivation: ${tenantId}`);

    // Step 1: Validate tenant exists and is inactive
    const tenant = await this.tenantRepository.findByIdIncludeInactive(tenantId);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    if (tenant.isActive) {
      this.logger.warn(`Tenant ${tenantId} is already active`);
      throw new BadRequestException(`Tenant ${tenantId} is already active`);
    }

    try {
      // Step 2: Validate tenant can be reactivated
      await this.validateReactivation(tenant);

      // Step 3: Validate subscription (if applicable)
      // This will be fully implemented in Phase 5
      await this.validateSubscription(tenant);

      // Step 4: Validate tenant schema exists and is healthy
      await this.validateTenantSchema(tenant);

      // Step 5: Reactivate tenant (mark as active)
      await this.tenantRepository.activateTenant(tenantId);

      // Step 6: Reactivate tenant admins (restore access)
      await this.reactivateTenantAdmins(tenantId);

      // Step 7: Log reactivation event (audit logging)
      await this.logReactivationEvent(tenant, reason, reactivatedBy);

      // Step 8: Log tenant operations restoration
      this.logger.log(`Tenant reactivated successfully: ${tenant.tenantKey} (ID: ${tenant.id})`);

      // Reload tenant to get updated state
      const reactivatedTenant = await this.tenantRepository.findById(tenantId);

      if (!reactivatedTenant) {
        throw new NotFoundException(`Tenant with ID ${tenantId} not found after reactivation`);
      }

      return reactivatedTenant;
    } catch (error) {
      this.logger.error(
        `Failed to reactivate tenant: ${tenantId}`,
        error instanceof Error ? error.stack : String(error),
      );

      // Re-throw known exceptions
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      // Wrap unknown errors
      throw new BadRequestException(
        `Failed to reactivate tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Reactivate tenant by tenant key
   *
   * @param tenantKey - Tenant key to reactivate
   * @param reason - Optional reason for reactivation
   * @param reactivatedBy - User ID who performed the reactivation
   * @returns Reactivated tenant entity
   */
  async reactivateTenantByKey(
    tenantKey: string,
    reason?: string,
    reactivatedBy?: number,
  ): Promise<Tenant> {
    const normalizedTenantKey = tenantKey.trim().toLowerCase();
    const tenant = await this.tenantRepository.findByTenantKey(
      normalizedTenantKey,
      true, // Include inactive
    );

    if (!tenant) {
      throw new NotFoundException(`Tenant with key '${tenantKey}' not found`);
    }

    return this.reactivateTenant(tenant.id, reason, reactivatedBy);
  }

  /**
   * Validate that tenant can be reactivated
   * Checks for any blocking conditions
   *
   * @param tenant - Tenant entity
   * @throws BadRequestException if tenant cannot be reactivated
   */
  private async validateReactivation(tenant: Tenant): Promise<void> {
    // Check if tenant schema still exists
    const schemaName = tenant.getSchemaName();
    const schemaExists = await this.multiTenantService.schemaExists(schemaName);

    if (!schemaExists) {
      throw new BadRequestException(
        `Tenant schema '${schemaName}' does not exist. Tenant cannot be reactivated. Please reprovision the tenant.`,
      );
    }

    // Check if tenant schema has required tables
    const requiredTables = ['users', 'roles', 'organizations'];
    const hasRequiredTables = await this.multiTenantService.validateSchemaTables(
      schemaName,
      requiredTables,
    );

    if (!hasRequiredTables) {
      throw new BadRequestException(
        `Tenant schema '${schemaName}' is missing required tables. Tenant cannot be reactivated. Please reprovision the tenant.`,
      );
    }

    // Additional validation can be added here
    // For example: check if tenant data is corrupted, check retention period, etc.
  }

  /**
   * Validate tenant subscription
   * This will be fully implemented in Phase 5 when subscription system is ready
   *
   * @param tenant - Tenant entity
   * @throws BadRequestException if subscription is invalid
   */
  private async validateSubscription(tenant: Tenant): Promise<void> {
    // TODO: Implement subscription validation in Phase 5
    // For now, we'll skip this check but leave the structure in place

    // Placeholder for subscription validation:
    // 1. Check if tenant has an active subscription
    // 2. Check if subscription is not expired
    // 3. Check if subscription is not cancelled
    // 4. Check if subscription is in grace period (if applicable)

    this.logger.debug(`Subscription validation skipped for tenant: ${tenant.tenantKey} (Phase 5)`);
  }

  /**
   * Validate tenant schema exists and is healthy
   *
   * @param tenant - Tenant entity
   * @throws BadRequestException if schema is invalid
   */
  private async validateTenantSchema(tenant: Tenant): Promise<void> {
    const schemaName = tenant.getSchemaName();

    // Check if schema exists
    const schemaExists = await this.multiTenantService.schemaExists(schemaName);
    if (!schemaExists) {
      throw new BadRequestException(
        `Tenant schema '${schemaName}' does not exist. Cannot reactivate tenant.`,
      );
    }

    // Check if required tables exist
    const requiredTables = ['users', 'roles', 'organizations', 'organization_memberships'];
    const hasRequiredTables = await this.multiTenantService.validateSchemaTables(
      schemaName,
      requiredTables,
    );

    if (!hasRequiredTables) {
      throw new BadRequestException(
        `Tenant schema '${schemaName}' is missing required tables. Cannot reactivate tenant.`,
      );
    }

    this.logger.log(`Tenant schema validated: ${schemaName}`);
  }

  /**
   * Reactivate all tenant admins for a tenant
   * This restores access for tenant administrators
   *
   * @param tenantId - Tenant ID
   */
  private async reactivateTenantAdmins(tenantId: number): Promise<void> {
    this.logger.log(`Reactivating tenant admins for tenant: ${tenantId}`);

    const tenantAdmins = await this.tenantAdminRepository.findByTenantId(tenantId);

    if (tenantAdmins.length === 0) {
      this.logger.warn(`No tenant admins found for tenant: ${tenantId}`);
      return;
    }

    // Reactivate all tenant admins
    const reactivationPromises = tenantAdmins.map(async (admin) => {
      if (!admin.isActive) {
        await this.tenantAdminRepository.update(admin.id, {
          isActive: true,
          // Reset lock status if account was locked
          isLocked: false,
          lockedUntil: null,
          failedLoginAttempts: 0,
        });
        this.logger.log(`Reactivated tenant admin: ${admin.email} (ID: ${admin.id})`);
      }
    });

    await Promise.all(reactivationPromises);

    this.logger.log(`Reactivated ${tenantAdmins.length} tenant admin(s) for tenant: ${tenantId}`);
  }

  /**
   * Log tenant reactivation event to audit logs
   *
   * @param tenant - Tenant entity
   * @param reason - Optional reason for reactivation
   * @param reactivatedBy - User ID who performed the reactivation
   */
  private async logReactivationEvent(
    tenant: Tenant,
    reason?: string,
    reactivatedBy?: number,
  ): Promise<void> {
    try {
      const metadata = {
        tenantId: tenant.id,
        tenantKey: tenant.tenantKey,
        tenantName: tenant.name,
        reason: reason || 'No reason provided',
        reactivatedAt: new Date().toISOString(),
        deactivatedAt: tenant.updatedAt.toISOString(), // Last update was deactivation
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
          'TENANT_REACTIVATED',
          'TENANT',
          tenant.id,
          'REACTIVATE',
          'SUCCESS',
          reactivatedBy || null,
          'SUPER_ADMIN',
          tenant.id,
          JSON.stringify(metadata),
          new Date(),
        ],
      );

      this.logger.log(
        `Logged reactivation event for tenant: ${tenant.tenantKey} (ID: ${tenant.id})`,
      );
    } catch (error) {
      // Log error but don't fail reactivation
      this.logger.error(
        `Failed to log reactivation event for tenant: ${tenant.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Check if tenant can be reactivated
   * Validates that tenant is inactive and has no blocking conditions
   *
   * @param tenantId - Tenant ID
   * @returns Validation result with details
   */
  async canReactivateTenant(tenantId: number): Promise<{
    canReactivate: boolean;
    reasons: string[];
  }> {
    const tenant = await this.tenantRepository.findByIdIncludeInactive(tenantId);

    if (!tenant) {
      return {
        canReactivate: false,
        reasons: ['Tenant not found'],
      };
    }

    if (tenant.isActive) {
      return {
        canReactivate: false,
        reasons: ['Tenant is already active'],
      };
    }

    const reasons: string[] = [];

    // Check if tenant schema exists
    const schemaName = tenant.getSchemaName();
    const schemaExists = await this.multiTenantService.schemaExists(schemaName);
    if (!schemaExists) {
      reasons.push('Tenant schema does not exist. Tenant must be reprovisioned.');
    } else {
      // Check if required tables exist
      const requiredTables = ['users', 'roles', 'organizations'];
      const hasRequiredTables = await this.multiTenantService.validateSchemaTables(
        schemaName,
        requiredTables,
      );
      if (!hasRequiredTables) {
        reasons.push('Tenant schema is missing required tables. Tenant must be reprovisioned.');
      }
    }

    // Check subscription (will be implemented in Phase 5)
    // For now, we allow reactivation
    // TODO: Add subscription check in Phase 5

    return {
      canReactivate: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Get reactivation eligibility information for a tenant
   *
   * @param tenantId - Tenant ID
   * @returns Reactivation eligibility information
   */
  async getReactivationEligibility(tenantId: number): Promise<{
    canReactivate: boolean;
    reasons: string[];
    schemaExists: boolean;
    hasRequiredTables: boolean;
    subscriptionValid: boolean;
  }> {
    const tenant = await this.tenantRepository.findByIdIncludeInactive(tenantId);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const schemaName = tenant.getSchemaName();
    const schemaExists = await this.multiTenantService.schemaExists(schemaName);

    let hasRequiredTables = false;
    if (schemaExists) {
      const requiredTables = ['users', 'roles', 'organizations'];
      hasRequiredTables = await this.multiTenantService.validateSchemaTables(
        schemaName,
        requiredTables,
      );
    }

    // Subscription validation (placeholder for Phase 5)
    const subscriptionValid = true; // TODO: Implement in Phase 5

    const validationResult = await this.canReactivateTenant(tenantId);

    return {
      canReactivate: validationResult.canReactivate,
      reasons: validationResult.reasons,
      schemaExists,
      hasRequiredTables,
      subscriptionValid,
    };
  }
}
