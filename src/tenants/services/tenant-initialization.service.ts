import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { MultiTenantService } from '../../database/multi-tenant.service';
import { PasswordService } from '../../auth/services/password.service';
import { Tenant } from '../../admin/entities/tenant.entity';
import { TenantAdminRepository } from '../../admin/repositories/tenant-admin.repository';

/**
 * Tenant Initialization Service
 * 
 * Initializes a newly provisioned tenant with default data:
 * 1. Create default roles (ADMIN, HR, MANAGER, EMPLOYEE)
 * 2. Create default permissions (if permissions table exists)
 * 3. Create tenant admin user in tenant schema
 * 4. Create default organization
 * 
 * This service should be called after tenant provisioning is complete.
 */
@Injectable()
export class TenantInitializationService {
  private readonly logger = new Logger(TenantInitializationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly multiTenantService: MultiTenantService,
    private readonly passwordService: PasswordService,
    private readonly tenantAdminRepository: TenantAdminRepository,
  ) {}

  /**
   * Initialize tenant with default data
   * 
   * @param tenant - Tenant entity
   * @param tenantAdminEmail - Email for tenant admin user
   * @param tenantAdminPassword - Password for tenant admin user
   * @param tenantAdminFullName - Full name for tenant admin user
   * @returns Initialization result
   */
  async initializeTenant(
    tenant: Tenant,
    tenantAdminEmail: string,
    tenantAdminPassword: string,
    tenantAdminFullName: string,
  ): Promise<{
    rolesCreated: number;
    adminUserCreated: boolean;
    defaultOrganizationCreated: boolean;
  }> {
    const schemaName = this.multiTenantService.getTenantSchemaName(
      tenant.tenantKey,
    );

    this.logger.log(
      `Initializing tenant: ${tenant.tenantKey} (schema: ${schemaName})`,
    );

    // Get EntityManager for tenant schema
    const tenantManager = await this.multiTenantService.getEntityManagerForSchema(
      schemaName,
    );

    try {
      // Step 1: Create default roles
      const rolesCreated = await this.createDefaultRoles(tenantManager);

      // Step 2: Create default permissions (if permissions table exists)
      // Note: Permissions will be fully implemented in Phase 6 (Commit 76)
      // For now, we'll skip this step
      // await this.createDefaultPermissions(tenantManager);

      // Step 3: Create tenant admin user in tenant schema
      const adminUser = await this.createTenantAdminUser(
        tenantManager,
        tenantAdminEmail,
        tenantAdminPassword,
        tenantAdminFullName,
      );

      // Step 3b: Create tenant admin record in admin schema (for authentication)
      try {
        await this.createTenantAdminRecord(
          tenant,
          tenantAdminEmail,
          tenantAdminPassword,
          tenantAdminFullName,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create tenant admin record in admin schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error instanceof Error ? error.stack : String(error),
        );
        // Don't fail tenant creation if admin record creation fails, but log it
        // The fix-admin endpoint can be used later to create it
        throw new BadRequestException(
          `Tenant created but failed to create tenant admin record: ${error instanceof Error ? error.message : 'Unknown error'}. Please use the fix-admin endpoint.`,
        );
      }

      // Step 4: Create default organization
      const defaultOrg = await this.createDefaultOrganization(
        tenantManager,
        tenant.name,
        adminUser.id,
      );

      // Step 5: Assign admin user to default organization
      await this.assignUserToOrganization(
        tenantManager,
        adminUser.id,
        defaultOrg.id,
        'ADMIN',
        true, // isPrimary
      );

      this.logger.log(
        `Successfully initialized tenant: ${tenant.tenantKey}`,
      );

      return {
        rolesCreated,
        adminUserCreated: true,
        defaultOrganizationCreated: true,
      };
    } finally {
      // Note: EntityManager cleanup is handled by MultiTenantService
    }
  }

  /**
   * Create default roles: ADMIN, HR, MANAGER, EMPLOYEE
   * @param manager - EntityManager for tenant schema
   * @returns Number of roles created
   */
  private async createDefaultRoles(manager: EntityManager): Promise<number> {
    this.logger.log('Creating default roles...');

    const defaultRoles = [
      {
        name: 'ADMIN',
        description: 'Administrator - Full system access',
        isSystemRole: true,
      },
      {
        name: 'HR',
        description: 'HR Admin - Human resources management',
        isSystemRole: true,
      },
      {
        name: 'MANAGER',
        description: 'Manager - Team management access',
        isSystemRole: true,
      },
      {
        name: 'EMPLOYEE',
        description: 'Employee - Basic employee access',
        isSystemRole: true,
      },
    ];

    let rolesCreated = 0;

    for (const roleData of defaultRoles) {
      // Check if role already exists
      const existingRole = await manager.query(
        `SELECT id FROM roles WHERE name = $1`,
        [roleData.name],
      );

      if (existingRole.length === 0) {
        await manager.query(
          `INSERT INTO roles (name, description, is_system_role, created_at, updated_at)
           VALUES ($1, $2, $3, now(), now())`,
          [roleData.name, roleData.description, roleData.isSystemRole],
        );
        rolesCreated++;
        this.logger.log(`Created role: ${roleData.name}`);
      } else {
        this.logger.debug(`Role already exists: ${roleData.name}`);
      }
    }

    this.logger.log(`Created ${rolesCreated} default role(s)`);
    return rolesCreated;
  }

  /**
   * Create tenant admin user in tenant schema
   * @param manager - EntityManager for tenant schema
   * @param email - User email
   * @param password - User password (will be hashed)
   * @param fullName - User full name
   * @returns Created user ID
   */
  private async createTenantAdminUser(
    manager: EntityManager,
    email: string,
    password: string,
    fullName: string,
  ): Promise<{ id: number }> {
    this.logger.log(`Creating tenant admin user: ${email}`);

    // Validate email
    if (!email || !email.trim()) {
      throw new BadRequestException('Tenant admin email is required');
    }

    // Validate password
    if (!password || password.length < 8) {
      throw new BadRequestException(
        'Tenant admin password must be at least 8 characters',
      );
    }

    // Check if user already exists
    const existingUser = await manager.query(
      `SELECT id FROM users WHERE email = $1`,
      [email.trim().toLowerCase()],
    );

    if (existingUser.length > 0) {
      this.logger.warn(`User already exists: ${email}`);
      return { id: existingUser[0].id };
    }

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(password);

    // Create user
    const result = await manager.query(
      `INSERT INTO users (email, password_hash, full_name, active, created_at, updated_at)
       VALUES ($1, $2, $3, true, now(), now())
       RETURNING id`,
      [email.trim().toLowerCase(), passwordHash, fullName.trim()],
    );

    const userId = result[0].id;

    // Assign ADMIN role to tenant admin user
    await this.assignRoleToUser(manager, userId, 'ADMIN');

    this.logger.log(`Created tenant admin user: ${email} (ID: ${userId})`);
    return { id: userId };
  }

  /**
   * Create tenant admin record in admin schema
   * This record is used for tenant admin authentication
   * @param tenant - Tenant entity
   * @param email - Admin email
   * @param password - Admin password (will be hashed)
   * @param fullName - Admin full name
   */
  private async createTenantAdminRecord(
    tenant: Tenant,
    email: string,
    password: string,
    fullName: string,
  ): Promise<void> {
    this.logger.log(`Creating tenant admin record in admin schema: ${email} for tenant ${tenant.tenantKey}`);

    try {
      // Check if tenant admin record already exists
      const existingAdmin = await this.tenantAdminRepository.findByEmailAndTenantId(
        email,
        tenant.id,
      );

      if (existingAdmin) {
        this.logger.warn(`Tenant admin record already exists: ${email} for tenant ${tenant.tenantKey}`);
        return;
      }

      // Hash password (use same hash as tenant user)
      this.logger.log(`Hashing password for tenant admin record...`);
      const passwordHash = await this.passwordService.hashPassword(password);
      this.logger.log(`Password hashed successfully for tenant admin record`);

      // Create tenant admin record in admin schema
      this.logger.log(`Creating tenant admin record in admin.tenant_admin table...`);
      const createdAdmin = await this.tenantAdminRepository.createWithTenant(
        tenant,
        email,
        passwordHash,
        fullName,
      );

      this.logger.log(
        `Successfully created tenant admin record in admin schema: ${email} (ID: ${createdAdmin.id}) for tenant ${tenant.tenantKey}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create tenant admin record in admin schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Assign role to user
   * @param manager - EntityManager for tenant schema
   * @param userId - User ID
   * @param roleName - Role name
   */
  private async assignRoleToUser(
    manager: EntityManager,
    userId: number,
    roleName: string,
  ): Promise<void> {
    // Get role ID
    const roleResult = await manager.query(
      `SELECT id FROM roles WHERE name = $1`,
      [roleName],
    );

    if (roleResult.length === 0) {
      throw new BadRequestException(`Role not found: ${roleName}`);
    }

    const roleId = roleResult[0].id;

    // Check if user-role assignment already exists
    const existingAssignment = await manager.query(
      `SELECT user_id FROM user_roles WHERE user_id = $1 AND role_id = $2`,
      [userId, roleId],
    );

    if (existingAssignment.length === 0) {
      await manager.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_at)
         VALUES ($1, $2, now())`,
        [userId, roleId],
      );
      this.logger.log(`Assigned role ${roleName} to user ${userId}`);
    }
  }

  /**
   * Create default organization
   * @param manager - EntityManager for tenant schema
   * @param organizationName - Organization name (defaults to tenant name)
   * @param createdBy - User ID who created the organization
   * @returns Created organization ID
   */
  private async createDefaultOrganization(
    manager: EntityManager,
    organizationName: string,
    createdBy: number,
  ): Promise<{ id: number }> {
    this.logger.log(`Creating default organization: ${organizationName}`);

    // Check if default organization already exists
    const existingOrg = await manager.query(
      `SELECT id FROM organizations WHERE is_default = true`,
    );

    if (existingOrg.length > 0) {
      this.logger.warn('Default organization already exists');
      return { id: existingOrg[0].id };
    }

    // Generate organization key from name
    const organizationKey = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 128);

    // Ensure uniqueness
    let uniqueKey = organizationKey;
    let counter = 1;
    while (true) {
      const existing = await manager.query(
        `SELECT id FROM organizations WHERE organization_key = $1`,
        [uniqueKey],
      );
      if (existing.length === 0) {
        break;
      }
      uniqueKey = `${organizationKey}-${counter}`;
      counter++;
    }

    // Create organization
    const result = await manager.query(
      `INSERT INTO organizations (
        organization_key, name, display_name, organization_type, status,
        is_default, created_at, updated_at, created_by
      )
      VALUES ($1, $2, $3, 'COMPANY', 'ACTIVE', true, now(), now(), $4)
      RETURNING id`,
      [uniqueKey, organizationName, organizationName, createdBy],
    );

    const orgId = result[0].id;
    this.logger.log(
      `Created default organization: ${organizationName} (ID: ${orgId})`,
    );

    return { id: orgId };
  }

  /**
   * Assign user to organization
   * @param manager - EntityManager for tenant schema
   * @param userId - User ID
   * @param organizationId - Organization ID
   * @param role - Role in organization
   * @param isPrimary - Whether this is the primary organization
   */
  private async assignUserToOrganization(
    manager: EntityManager,
    userId: number,
    organizationId: number,
    role: string,
    isPrimary: boolean,
  ): Promise<void> {
    // Check if membership already exists
    const existingMembership = await manager.query(
      `SELECT id FROM organization_memberships 
       WHERE user_id = $1 AND organization_id = $2 AND left_at IS NULL`,
      [userId, organizationId],
    );

    if (existingMembership.length > 0) {
      this.logger.debug(
        `User ${userId} already belongs to organization ${organizationId}`,
      );
      return;
    }

    // If this is primary, unset other primary memberships
    if (isPrimary) {
      await manager.query(
        `UPDATE organization_memberships 
         SET is_primary = false 
         WHERE user_id = $1 AND is_primary = true`,
        [userId],
      );
    }

    // Create membership
    await manager.query(
      `INSERT INTO organization_memberships (
        user_id, organization_id, role, is_primary, joined_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, now(), now(), now())`,
      [userId, organizationId, role, isPrimary],
    );

    this.logger.log(
      `Assigned user ${userId} to organization ${organizationId} as ${role}`,
    );
  }
}

