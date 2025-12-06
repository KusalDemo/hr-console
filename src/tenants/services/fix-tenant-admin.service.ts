import { Injectable, Logger } from '@nestjs/common';
import { TenantRepository } from '../../admin/repositories/tenant.repository';
import { TenantAdminRepository } from '../../admin/repositories/tenant-admin.repository';
import { MultiTenantService } from '../../database/multi-tenant.service';
import { PasswordService } from '../../auth/services/password.service';

/**
 * Service to fix existing tenants that are missing tenant admin records
 * This is a one-time fix for tenants created before the tenant admin record creation was added
 */
@Injectable()
export class FixTenantAdminService {
  private readonly logger = new Logger(FixTenantAdminService.name);

  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly tenantAdminRepository: TenantAdminRepository,
    private readonly multiTenantService: MultiTenantService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Fix tenant admin record for a specific tenant
   * This will:
   * 1. Find the tenant admin user in the tenant schema
   * 2. Create a tenant admin record in admin schema if it doesn't exist
   * 
   * @param tenantKey - Tenant key
   * @param tenantAdminEmail - Tenant admin email (must match the user in tenant schema)
   * @param tenantAdminPassword - Tenant admin password (will be re-hashed for admin record)
   * @returns True if fixed, false if already exists or tenant not found
   */
  async fixTenantAdmin(
    tenantKey: string,
    tenantAdminEmail: string,
    tenantAdminPassword: string,
  ): Promise<boolean> {
    this.logger.log(`Fixing tenant admin for tenant: ${tenantKey}, email: ${tenantAdminEmail}`);

    // Find tenant
    const tenant = await this.tenantRepository.findByTenantKey(tenantKey, true);
    if (!tenant) {
      this.logger.error(`Tenant not found: ${tenantKey}`);
      return false;
    }

    // Check if tenant admin record already exists
    const existingAdmin = await this.tenantAdminRepository.findByEmailAndTenantId(
      tenantAdminEmail,
      tenant.id,
    );

    if (existingAdmin) {
      this.logger.log(`Tenant admin record already exists for ${tenantAdminEmail}`);
      return false;
    }

    // Verify user exists in tenant schema
    const schemaName = this.multiTenantService.getTenantSchemaName(tenantKey);
    const schemaExists = await this.multiTenantService.schemaExists(schemaName);
    
    if (!schemaExists) {
      this.logger.error(`Tenant schema does not exist: ${schemaName}`);
      return false;
    }

    // Get EntityManager for tenant schema
    const tenantManager = await this.multiTenantService.getEntityManagerForSchema(schemaName);

    try {
      // Check if user exists in tenant schema
      const userResult = await tenantManager.query(
        `SELECT id, email, password_hash, full_name FROM users WHERE email = $1`,
        [tenantAdminEmail.trim().toLowerCase()],
      );

      if (userResult.length === 0) {
        this.logger.error(`User not found in tenant schema: ${tenantAdminEmail}`);
        return false;
      }

      const user = userResult[0];
      this.logger.log(`Found user in tenant schema: ${user.email} (ID: ${user.id})`);

      // Generate hash for input password
      const inputPasswordHash = await this.passwordService.hashPassword(tenantAdminPassword);

      // DEBUG LOGGING - COMPREHENSIVE SINGLE LOG - Remove in production
      this.logger.log(`[DEBUG] ========== FIX TENANT ADMIN DEBUG ==========`);
      this.logger.log(`[DEBUG] Tenant: ${tenantKey}`);
      this.logger.log(`[DEBUG] Email: ${tenantAdminEmail}`);
      this.logger.log(`[DEBUG] Input Password (PLAIN TEXT): ${tenantAdminPassword}`);
      this.logger.log(`[DEBUG] Input Password Hash (NEW): ${inputPasswordHash}`);
      this.logger.log(`[DEBUG] Stored Password Hash (Tenant Schema DB): ${user.password_hash}`);
      this.logger.log(`[DEBUG] User ID: ${user.id}`);
      this.logger.log(`[DEBUG] User Full Name: ${user.full_name}`);
      this.logger.log(`[DEBUG] =============================================`);

      // Verify password matches the one in tenant schema
      const isPasswordValid = await this.passwordService.verifyPassword(
        tenantAdminPassword,
        user.password_hash,
      );

      this.logger.log(`[DEBUG] Password verification result: ${isPasswordValid}`);

      if (!isPasswordValid) {
        this.logger.error(`[DEBUG] Password does not match for user: ${tenantAdminEmail}`);
        return false;
      }

      // Hash password for admin record (will be different hash but same password)
      const passwordHash = await this.passwordService.hashPassword(tenantAdminPassword);
      
      // DEBUG LOGGING - Remove in production
      this.logger.log(`[DEBUG] Generated hash for admin record: ${passwordHash}`);

      // Create tenant admin record in admin schema
      await this.tenantAdminRepository.createWithTenant(
        tenant,
        tenantAdminEmail,
        passwordHash,
        user.full_name || 'Tenant Admin',
      );

      this.logger.log(
        `Successfully created tenant admin record for ${tenantAdminEmail} in tenant ${tenantKey}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Error fixing tenant admin for ${tenantKey}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Fix all tenants that are missing tenant admin records
   * This will attempt to find the first admin user in each tenant schema and create the admin record
   * 
   * WARNING: This is a best-effort approach and may not work for all tenants
   * It's better to use fixTenantAdmin with explicit credentials
   */
  async fixAllTenants(): Promise<{ fixed: number; failed: number; skipped: number }> {
    this.logger.log('Starting to fix all tenants...');

    const tenants = await this.tenantRepository.find({
      where: { isActive: true },
    });

    let fixed = 0;
    let failed = 0;
    let skipped = 0;

    for (const tenant of tenants) {
      try {
        // Check if tenant admin already exists
        const existingAdmins = await this.tenantAdminRepository.find({
          where: { tenant: { id: tenant.id }, isActive: true },
        });

        if (existingAdmins.length > 0) {
          this.logger.log(`Tenant ${tenant.tenantKey} already has admin record(s), skipping`);
          skipped++;
          continue;
        }

        // Try to find admin user in tenant schema
        const schemaName = this.multiTenantService.getTenantSchemaName(tenant.tenantKey);
        const schemaExists = await this.multiTenantService.schemaExists(schemaName);

        if (!schemaExists) {
          this.logger.warn(`Schema does not exist for tenant ${tenant.tenantKey}, skipping`);
          skipped++;
          continue;
        }

        const tenantManager = await this.multiTenantService.getEntityManagerForSchema(schemaName);

        // Find users with ADMIN role
        const adminUsers = await tenantManager.query(
          `SELECT u.id, u.email, u.password_hash, u.full_name
           FROM users u
           INNER JOIN user_roles ur ON u.id = ur.user_id
           INNER JOIN roles r ON ur.role_id = r.id
           WHERE r.name = 'ADMIN' AND u.active = true
           LIMIT 1`,
        );

        if (adminUsers.length === 0) {
          this.logger.warn(`No admin user found in tenant ${tenant.tenantKey}, skipping`);
          skipped++;
          continue;
        }

        const adminUser = adminUsers[0];
        this.logger.log(
          `Found admin user in tenant ${tenant.tenantKey}: ${adminUser.email}`,
        );

        // Note: We can't verify the password without knowing it, so we'll use a placeholder
        // This method is not recommended - use fixTenantAdmin with explicit credentials instead
        this.logger.warn(
          `Cannot create tenant admin record without password for ${tenant.tenantKey}. Use fixTenantAdmin with explicit credentials.`,
        );
        skipped++;
      } catch (error) {
        this.logger.error(
          `Error processing tenant ${tenant.tenantKey}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        failed++;
      }
    }

    this.logger.log(
      `Finished fixing tenants. Fixed: ${fixed}, Failed: ${failed}, Skipped: ${skipped}`,
    );

    return { fixed, failed, skipped };
  }
}

