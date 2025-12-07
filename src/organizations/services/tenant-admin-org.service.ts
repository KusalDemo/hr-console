import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationContextService } from './organization-context.service';
import { TenantContextService } from '../../tenants/services/tenant-context.service';
import { Organization, OrganizationStatus } from '../entities/organization.entity';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

/**
 * Tenant Admin Organization Access Service
 * 
 * Provides specialized functionality for tenant administrators:
 * - Access validation for all organizations in tenant
 * - Organization creation permissions
 * - Organization management permissions
 * - Bulk operations across all organizations
 * 
 * Tenant admins have full access to all organizations within their tenant,
 * regardless of membership. This service provides helper methods and
 * validation specifically for tenant admin operations.
 */
@Injectable()
export class TenantAdminOrgService {
  private readonly logger = new Logger(TenantAdminOrgService.name);

  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly organizationContextService: OrganizationContextService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  /**
   * Check if user is a tenant admin
   * 
   * @param user - JWT payload
   * @returns True if user is tenant admin
   */
  isTenantAdmin(user: JwtPayload): boolean {
    return user.userType === 'TENANT_ADMIN';
  }

  /**
   * Require tenant admin role
   * Throws ForbiddenException if user is not a tenant admin
   * 
   * @param user - JWT payload
   * @throws ForbiddenException if user is not tenant admin
   */
  requireTenantAdmin(user: JwtPayload): void {
    if (!this.isTenantAdmin(user)) {
      throw new ForbiddenException('This operation requires tenant admin privileges');
    }
  }

  /**
   * Check if tenant admin can access organization
   * Tenant admins can access all organizations in their tenant
   * 
   * @param organizationId - Organization ID to check
   * @param user - JWT payload
   * @returns True if tenant admin can access the organization
   */
  async canAccessOrganization(organizationId: number, user: JwtPayload): Promise<boolean> {
    // Only tenant admins can use this method
    if (!this.isTenantAdmin(user)) {
      return false;
    }

    // Get tenant context
    const tenantContext = this.tenantContextService.getContext();
    if (!tenantContext || tenantContext.isSuperAdmin) {
      return false;
    }

    // Get organization
    const organization = await this.organizationRepository.findById(organizationId, false);
    if (!organization) {
      return false;
    }

    // Tenant admins can access all organizations in their tenant
    // The organization is already scoped to the tenant by the repository
    return true;
  }

  /**
   * Validate tenant admin can access organization
   * Throws exception if access is denied
   * 
   * @param organizationId - Organization ID to validate
   * @param user - JWT payload
   * @throws ForbiddenException if access is denied
   */
  async validateOrganizationAccess(organizationId: number, user: JwtPayload): Promise<void> {
    this.requireTenantAdmin(user);

    const canAccess = await this.canAccessOrganization(organizationId, user);
    if (!canAccess) {
      throw new ForbiddenException(
        `Tenant admin does not have access to organization ${organizationId}`,
      );
    }
  }

  /**
   * Check if tenant admin can create organizations
   * Tenant admins can create organizations in their tenant
   * 
   * @param user - JWT payload
   * @returns True if tenant admin can create organizations
   */
  canCreateOrganization(user: JwtPayload): boolean {
    return this.isTenantAdmin(user);
  }

  /**
   * Validate tenant admin can create organizations
   * Throws exception if permission is denied
   * 
   * @param user - JWT payload
   * @throws ForbiddenException if permission is denied
   */
  validateCanCreateOrganization(user: JwtPayload): void {
    if (!this.canCreateOrganization(user)) {
      throw new ForbiddenException(
        'Only tenant admins can create organizations',
      );
    }
  }

  /**
   * Check if tenant admin can manage organization
   * Tenant admins can manage all organizations in their tenant
   * 
   * @param organizationId - Organization ID
   * @param user - JWT payload
   * @returns True if tenant admin can manage the organization
   */
  async canManageOrganization(organizationId: number, user: JwtPayload): Promise<boolean> {
    return this.canAccessOrganization(organizationId, user);
  }

  /**
   * Validate tenant admin can manage organization
   * Throws exception if permission is denied
   * 
   * @param organizationId - Organization ID
   * @param user - JWT payload
   * @throws ForbiddenException if permission is denied
   */
  async validateCanManageOrganization(
    organizationId: number,
    user: JwtPayload,
  ): Promise<void> {
    await this.validateOrganizationAccess(organizationId, user);
  }

  /**
   * Get all organizations accessible to tenant admin
   * Returns all organizations in the tenant
   * 
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns Array of organizations
   */
  async getAllAccessibleOrganizations(includeInactive: boolean = false): Promise<Organization[]> {
    const tenantContext = this.tenantContextService.getContext();
    if (!tenantContext || tenantContext.isSuperAdmin) {
      return [];
    }

    if (includeInactive) {
      return this.organizationRepository.findAll(true);
    }

    return this.organizationRepository.findAllActive();
  }

  /**
   * Get organization count for tenant admin
   * Returns total number of organizations in the tenant
   * 
   * @param includeInactive - Include inactive organizations (default: false)
   * @returns Organization count
   */
  async getOrganizationCount(includeInactive: boolean = false): Promise<number> {
    const organizations = await this.getAllAccessibleOrganizations(includeInactive);
    return organizations.length;
  }

  /**
   * Get active organization count for tenant admin
   * Returns number of active organizations in the tenant
   * 
   * @returns Active organization count
   */
  async getActiveOrganizationCount(): Promise<number> {
    return this.getOrganizationCount(false);
  }

  /**
   * Get inactive organization count for tenant admin
   * Returns number of inactive organizations in the tenant
   * 
   * @returns Inactive organization count
   */
  async getInactiveOrganizationCount(): Promise<number> {
    const allCount = await this.getOrganizationCount(true);
    const activeCount = await this.getActiveOrganizationCount();
    return allCount - activeCount;
  }

  /**
   * Check if tenant admin can delete organization
   * Tenant admins can delete organizations (soft delete) in their tenant
   * 
   * @param organizationId - Organization ID
   * @param user - JWT payload
   * @returns True if tenant admin can delete the organization
   */
  async canDeleteOrganization(organizationId: number, user: JwtPayload): Promise<boolean> {
    return this.canAccessOrganization(organizationId, user);
  }

  /**
   * Validate tenant admin can delete organization
   * Throws exception if permission is denied
   * 
   * @param organizationId - Organization ID
   * @param user - JWT payload
   * @throws ForbiddenException if permission is denied
   */
  async validateCanDeleteOrganization(
    organizationId: number,
    user: JwtPayload,
  ): Promise<void> {
    await this.validateOrganizationAccess(organizationId, user);

    // Additional validation: cannot delete if organization has children
    const organization = await this.organizationRepository.findById(organizationId, true);
    if (!organization) {
      throw new BadRequestException(`Organization ${organizationId} not found`);
    }

    const hasChildren = await this.organizationRepository.hasChildren(organizationId);
    if (hasChildren) {
      throw new BadRequestException(
        'Cannot delete organization with child organizations. Please delete or reassign child organizations first.',
      );
    }
  }

  /**
   * Check if tenant admin can update organization
   * Tenant admins can update all organizations in their tenant
   * 
   * @param organizationId - Organization ID
   * @param user - JWT payload
   * @returns True if tenant admin can update the organization
   */
  async canUpdateOrganization(organizationId: number, user: JwtPayload): Promise<boolean> {
    return this.canAccessOrganization(organizationId, user);
  }

  /**
   * Validate tenant admin can update organization
   * Throws exception if permission is denied
   * 
   * @param organizationId - Organization ID
   * @param user - JWT payload
   * @throws ForbiddenException if permission is denied
   */
  async validateCanUpdateOrganization(
    organizationId: number,
    user: JwtPayload,
  ): Promise<void> {
    await this.validateOrganizationAccess(organizationId, user);
  }

  /**
   * Get organization statistics for tenant admin
   * Returns aggregated statistics for all organizations in the tenant
   * 
   * @returns Organization statistics
   */
  async getOrganizationStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    archived: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const organizations = await this.getAllAccessibleOrganizations(true);

    const stats = {
      total: organizations.length,
      active: 0,
      inactive: 0,
      archived: 0,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    };

    organizations.forEach((org) => {
      // Count by status
      if (org.status === OrganizationStatus.ACTIVE) {
        stats.active++;
      } else if (org.status === OrganizationStatus.INACTIVE) {
        stats.inactive++;
      } else if (org.status === OrganizationStatus.ARCHIVED) {
        stats.archived++;
      }

      // Count by type
      const type = org.organizationType;
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count by status
      const status = org.status;
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    });

    return stats;
  }
}



