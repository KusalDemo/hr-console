import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { OrganizationRepository } from '../repositories/organization.repository';
import { Organization } from '../entities/organization.entity';
import { UserRepository } from '../../users/repositories/user.repository';
import { DataSource } from 'typeorm';
import { TenantContextService } from '../../tenants/services/tenant-context.service';

/**
 * Organization context interface
 * Stores organization information for the current request
 */
export interface OrganizationContext {
  organizationId: number | null; // Current organization ID
  organizationKey: string | null; // Current organization key
  organization?: Organization; // Full organization entity (loaded when needed)
  organizationIds: number[]; // All organization IDs user belongs to
  isTenantAdmin: boolean; // Whether user is tenant admin (can access all orgs)
  userId: number; // User ID for membership validation
}

/**
 * Organization Context Service
 * Manages organization context using AsyncLocalStorage for request-scoped isolation
 *
 * This service provides:
 * - Organization context management per request
 * - Current organization resolution from JWT, headers, or user membership
 * - Organization switching logic
 * - Default organization selection
 * - Organization membership validation
 *
 * Priority for organization resolution:
 * 1. Request header (X-Organization or X-Organization-Key)
 * 2. JWT token organizationId claim
 * 3. User's primary organization
 * 4. Default organization for tenant
 */
@Injectable()
export class OrganizationContextService {
  private readonly logger = new Logger(OrganizationContextService.name);
  private readonly asyncLocalStorage = new AsyncLocalStorage<OrganizationContext>();

  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
    private readonly tenantContextService: TenantContextService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Run a function within an organization context
   * @param context - Organization context to set
   * @param fn - Function to run within the context
   * @returns Result of the function
   */
  async run<T>(context: OrganizationContext, fn: () => Promise<T>): Promise<T> {
    return this.asyncLocalStorage.run(context, fn);
  }

  /**
   * Run a synchronous function within an organization context
   * @param context - Organization context to set
   * @param fn - Function to run within the context
   * @returns Result of the function
   */
  runSync<T>(context: OrganizationContext, fn: () => T): T {
    return this.asyncLocalStorage.run(context, () => fn());
  }

  /**
   * Get the current organization context
   * @returns Current organization context or null if not set
   */
  getContext(): OrganizationContext | null {
    return this.asyncLocalStorage.getStore() || null;
  }

  /**
   * Get the current organization ID
   * @returns Current organization ID or null
   */
  getOrganizationId(): number | null {
    const context = this.getContext();
    return context?.organizationId || null;
  }

  /**
   * Get the current organization key
   * @returns Current organization key or null
   */
  getOrganizationKey(): string | null {
    const context = this.getContext();
    return context?.organizationKey || null;
  }

  /**
   * Get the current organization entity
   * @returns Organization entity or null
   */
  getOrganization(): Organization | null {
    const context = this.getContext();
    return context?.organization || null;
  }

  /**
   * Get all organization IDs the user belongs to
   * @returns Array of organization IDs
   */
  getOrganizationIds(): number[] {
    const context = this.getContext();
    return context?.organizationIds || [];
  }

  /**
   * Check if current user is tenant admin
   * Tenant admins can access all organizations in the tenant
   * @returns True if tenant admin, false otherwise
   */
  isTenantAdmin(): boolean {
    const context = this.getContext();
    return context?.isTenantAdmin || false;
  }

  /**
   * Check if organization context is set
   * @returns True if context is set, false otherwise
   */
  hasContext(): boolean {
    return this.getContext() !== null;
  }

  /**
   * Require organization context
   * Throws error if context is not set
   */
  requireContext(): OrganizationContext {
    const context = this.getContext();
    if (!context) {
      throw new BadRequestException('Organization context is not set');
    }
    return context;
  }

  /**
   * Require organization ID
   * Throws error if organization ID is not set
   */
  requireOrganizationId(): number {
    const context = this.requireContext();
    if (!context.organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return context.organizationId;
  }

  /**
   * Create organization context from JWT payload
   * Resolves organization using priority:
   * 1. JWT organizationId claim
   * 2. User's primary organization
   * 3. Default organization for tenant
   *
   * @param payload - JWT payload containing user and organization information
   * @param requestedOrganizationId - Optional organization ID from request header
   * @param requestedOrganizationKey - Optional organization key from request header
   * @returns Organization context
   */
  async createContextFromJwt(
    payload: JwtPayload,
    requestedOrganizationId?: string | number,
    requestedOrganizationKey?: string,
  ): Promise<OrganizationContext> {
    const tenantContext = this.tenantContextService.getContext();

    // Super admin doesn't have organization context
    if (payload.userType === 'SUPER_ADMIN' || !tenantContext || tenantContext.isSuperAdmin) {
      return {
        organizationId: null,
        organizationKey: null,
        organizationIds: [],
        isTenantAdmin: false,
        userId: payload.userId,
      };
    }

    const isTenantAdmin = payload.userType === 'TENANT_ADMIN';
    const userId = payload.userId;

    // Get all organization IDs user belongs to
    const organizationIds = await this.getUserOrganizationIds(userId, isTenantAdmin);

    // Priority 1: Requested organization ID (from header)
    if (requestedOrganizationId) {
      const orgId =
        typeof requestedOrganizationId === 'string'
          ? parseInt(requestedOrganizationId, 10)
          : requestedOrganizationId;

      if (!isNaN(orgId)) {
        const org = await this.validateAndGetOrganization(
          orgId,
          userId,
          isTenantAdmin,
          organizationIds,
        );
        if (org) {
          return {
            organizationId: org.id,
            organizationKey: org.organizationKey,
            organization: org,
            organizationIds,
            isTenantAdmin,
            userId,
          };
        }
      }
    }

    // Priority 2: Requested organization key (from header)
    if (requestedOrganizationKey) {
      const org = await this.organizationRepository.findByKey(
        requestedOrganizationKey.trim().toLowerCase(),
        false,
      );

      if (org && this.canAccessOrganization(org.id, userId, isTenantAdmin, organizationIds)) {
        return {
          organizationId: org.id,
          organizationKey: org.organizationKey,
          organization: org,
          organizationIds,
          isTenantAdmin,
          userId,
        };
      }
    }

    // Priority 3: JWT organizationId claim
    if (payload.organizationId) {
      const org = await this.validateAndGetOrganization(
        payload.organizationId,
        userId,
        isTenantAdmin,
        organizationIds,
      );
      if (org) {
        return {
          organizationId: org.id,
          organizationKey: org.organizationKey,
          organization: org,
          organizationIds,
          isTenantAdmin,
          userId,
        };
      }
    }

    // Priority 4: User's primary organization
    const primaryOrgId = await this.getUserPrimaryOrganizationId(userId);
    if (primaryOrgId) {
      const org = await this.organizationRepository.findById(primaryOrgId, false);
      if (org) {
        return {
          organizationId: org.id,
          organizationKey: org.organizationKey,
          organization: org,
          organizationIds,
          isTenantAdmin,
          userId,
        };
      }
    }

    // Priority 5: Default organization for tenant
    const defaultOrg = await this.organizationRepository.findDefault(false);
    if (defaultOrg) {
      return {
        organizationId: defaultOrg.id,
        organizationKey: defaultOrg.organizationKey,
        organization: defaultOrg,
        organizationIds,
        isTenantAdmin,
        userId,
      };
    }

    // No organization found - return context without organization
    this.logger.warn(`No organization found for user ${userId} in tenant`);
    return {
      organizationId: null,
      organizationKey: null,
      organizationIds,
      isTenantAdmin,
      userId,
    };
  }

  /**
   * Switch to a different organization
   * Validates that the user has access to the organization
   *
   * @param organizationId - Organization ID to switch to
   * @param userId - User ID (optional, uses current context if not provided)
   * @returns Updated organization context
   */
  async switchOrganization(organizationId: number, userId?: number): Promise<OrganizationContext> {
    const currentContext = this.getContext();
    if (!currentContext) {
      throw new BadRequestException('Organization context must be set before switching');
    }

    const targetUserId = userId || currentContext.userId;
    const isTenantAdmin = currentContext.isTenantAdmin;
    const organizationIds = currentContext.organizationIds;

    // Validate and get organization
    const org = await this.validateAndGetOrganization(
      organizationId,
      targetUserId,
      isTenantAdmin,
      organizationIds,
    );

    if (!org) {
      throw new NotFoundException(
        `Organization with ID ${organizationId} not found or access denied`,
      );
    }

    // Update context
    const newContext: OrganizationContext = {
      ...currentContext,
      organizationId: org.id,
      organizationKey: org.organizationKey,
      organization: org,
    };

    return newContext;
  }

  /**
   * Get default organization for current tenant
   * @returns Default organization or null
   */
  async getDefaultOrganization(): Promise<Organization | null> {
    return this.organizationRepository.findDefault(false);
  }

  /**
   * Validate user has access to organization
   * Tenant admins have access to all organizations
   * Regular users must be members of the organization
   *
   * @param organizationId - Organization ID to validate
   * @param userId - User ID
   * @param isTenantAdmin - Whether user is tenant admin
   * @param organizationIds - User's organization IDs
   * @returns True if user has access, false otherwise
   */
  canAccessOrganization(
    organizationId: number,
    userId: number,
    isTenantAdmin: boolean,
    organizationIds: number[],
  ): boolean {
    // Tenant admins can access all organizations
    if (isTenantAdmin) {
      return true;
    }

    // Regular users must be members
    return organizationIds.includes(organizationId);
  }

  /**
   * Validate and get organization
   * Checks if organization exists and user has access
   *
   * @param organizationId - Organization ID
   * @param userId - User ID
   * @param isTenantAdmin - Whether user is tenant admin
   * @param organizationIds - User's organization IDs
   * @returns Organization if valid and accessible, null otherwise
   */
  private async validateAndGetOrganization(
    organizationId: number,
    userId: number,
    isTenantAdmin: boolean,
    organizationIds: number[],
  ): Promise<Organization | null> {
    // Check access
    if (!this.canAccessOrganization(organizationId, userId, isTenantAdmin, organizationIds)) {
      return null;
    }

    // Get organization
    const org = await this.organizationRepository.findById(organizationId, false);
    return org;
  }

  /**
   * Get all organization IDs user belongs to
   * For tenant admins, returns all organization IDs in tenant
   *
   * @param userId - User ID
   * @param isTenantAdmin - Whether user is tenant admin
   * @returns Array of organization IDs
   */
  private async getUserOrganizationIds(userId: number, isTenantAdmin: boolean): Promise<number[]> {
    const tenantContext = this.tenantContextService.getContext();
    if (!tenantContext || tenantContext.isSuperAdmin) {
      return [];
    }

    const schemaName = tenantContext.schemaName;
    const quotedSchema = `"${schemaName.replace(/"/g, '""')}"`;

    // Check if organization_memberships table exists
    try {
      const hasTable = await this.dataSource.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 
          AND table_name = 'organization_memberships'
        )`,
        [schemaName],
      );

      if (!hasTable[0]?.exists) {
        return [];
      }
    } catch (error) {
      this.logger.debug(`Could not check for organization_memberships table: ${error}`);
      return [];
    }

    // For tenant admins, get all organizations in tenant
    if (isTenantAdmin) {
      try {
        const orgs = await this.organizationRepository.findAllActive();
        return orgs.map((org) => org.id);
      } catch (error) {
        this.logger.debug(`Could not get all organizations for tenant admin: ${error}`);
        return [];
      }
    }

    // For regular users, get their organization memberships
    try {
      const memberships = await this.dataSource.query(
        `SELECT organization_id
         FROM ${quotedSchema}.organization_memberships
         WHERE user_id = $1 AND left_at IS NULL`,
        [userId],
      );

      return memberships.map((m: { organization_id: number }) => m.organization_id);
    } catch (error) {
      this.logger.debug(`Could not get organization memberships for user ${userId}: ${error}`);
      return [];
    }
  }

  /**
   * Get user's primary organization ID
   *
   * @param userId - User ID
   * @returns Primary organization ID or null
   */
  private async getUserPrimaryOrganizationId(userId: number): Promise<number | null> {
    const tenantContext = this.tenantContextService.getContext();
    if (!tenantContext || tenantContext.isSuperAdmin) {
      return null;
    }

    const schemaName = tenantContext.schemaName;
    const quotedSchema = `"${schemaName.replace(/"/g, '""')}"`;

    try {
      const hasTable = await this.dataSource.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 
          AND table_name = 'organization_memberships'
        )`,
        [schemaName],
      );

      if (!hasTable[0]?.exists) {
        return null;
      }

      const membership = await this.dataSource.query(
        `SELECT organization_id
         FROM ${quotedSchema}.organization_memberships
         WHERE user_id = $1 AND is_primary = true AND left_at IS NULL
         LIMIT 1`,
        [userId],
      );

      if (membership.length > 0) {
        return membership[0].organization_id;
      }

      return null;
    } catch (error) {
      this.logger.debug(`Could not get primary organization for user ${userId}: ${error}`);
      return null;
    }
  }
}

