import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { OrganizationContextService } from '../services/organization-context.service';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationStatus } from '../entities/organization.entity';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

/**
 * Organization Access Guard
 * 
 * Validates that:
 * - Organization context is set
 * - Organization exists in database
 * - Organization is active
 * - User has access to the organization (tenant admin or member)
 * 
 * This guard should be used on routes that require a valid organization context.
 * Super admin requests are automatically allowed (they don't have an organization).
 * Tenant admin requests are automatically allowed (they can access all organizations).
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, TenantExistsGuard, OrganizationAccessGuard)
 * @Get('some-route')
 * someHandler() { ... }
 * 
 * Or with a specific organization ID from route parameter:
 * @UseGuards(JwtAuthGuard, TenantExistsGuard, OrganizationAccessGuard)
 * @Get('organizations/:id/employees')
 * getEmployees(@Param('id') id: number) { ... }
 */
@Injectable()
export class OrganizationAccessGuard implements CanActivate {
  private readonly logger = new Logger(OrganizationAccessGuard.name);

  constructor(
    private readonly organizationContextService: OrganizationContextService,
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  /**
   * Check if user has access to organization
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    // Super admin doesn't need organization validation
    if (user?.userType === 'SUPER_ADMIN') {
      return true;
    }

    // Get organization context
    const orgContext = this.organizationContextService.getContext();

    // If no context is set, organization context middleware may not have run
    // This could happen if the route is public or if middleware wasn't applied
    if (!orgContext) {
      this.logger.warn('Organization context not set. Ensure OrganizationSelectionMiddleware is applied.');
      throw new ForbiddenException('Organization context is required');
    }

    // If no organization ID in context, check if it's required
    // Some routes might work without an organization (tenant-level operations)
    if (!orgContext.organizationId) {
      // Check if route parameter has organization ID
      const orgIdFromParam = this.getOrganizationIdFromRequest(request);
      
      if (orgIdFromParam) {
        // Validate access to the organization from parameter
        return this.validateOrganizationAccess(orgIdFromParam, user, orgContext);
      }

      // If tenant admin and no specific organization needed, allow
      if (orgContext.isTenantAdmin) {
        return true;
      }

      // For regular users, organization is required
      throw new ForbiddenException('Organization context is required');
    }

    // Validate access to the organization in context
    return this.validateOrganizationAccess(
      orgContext.organizationId,
      user,
      orgContext,
    );
  }

  /**
   * Validate user has access to a specific organization
   * 
   * @param organizationId - Organization ID to validate
   * @param user - JWT payload
   * @param orgContext - Organization context
   * @returns True if access is granted
   */
  private async validateOrganizationAccess(
    organizationId: number,
    user: JwtPayload,
    orgContext: any,
  ): Promise<boolean> {
    // Load organization from database to ensure it exists and is active
    const organization = await this.organizationRepository.findById(organizationId, false);

    // Check if organization exists
    if (!organization) {
      this.logger.error(`Organization not found: ${organizationId}`, {
        organizationId,
        userId: user?.userId,
      });
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Check if organization is active
    if (organization.status !== OrganizationStatus.ACTIVE) {
      this.logger.warn(`Organization is not active: ${organizationId}`, {
        organizationId,
        status: organization.status,
        userId: user?.userId,
      });
      throw new ForbiddenException(
        `Organization is not active: ${organization.name}. Status: ${organization.status}`,
      );
    }

    // Tenant admins can access all organizations
    if (orgContext.isTenantAdmin) {
      return true;
    }

    // Regular users must be members of the organization
    const hasAccess = this.organizationContextService.canAccessOrganization(
      organizationId,
      orgContext.userId,
      orgContext.isTenantAdmin,
      orgContext.organizationIds,
    );

    if (!hasAccess) {
      this.logger.warn(
        `User ${orgContext.userId} does not have access to organization ${organizationId}`,
        {
          organizationId,
          userId: orgContext.userId,
          userOrganizationIds: orgContext.organizationIds,
        },
      );
      throw new ForbiddenException(
        `You do not have access to organization: ${organization.name}`,
      );
    }

    return true;
  }

  /**
   * Extract organization ID from request (route parameters or query)
   * 
   * @param request - HTTP request
   * @returns Organization ID or null
   */
  private getOrganizationIdFromRequest(request: any): number | null {
    // Check route parameters (e.g., /organizations/:id/...)
    if (request.params?.id) {
      const id = parseInt(request.params.id, 10);
      if (!isNaN(id)) {
        return id;
      }
    }

    // Check organizationId parameter
    if (request.params?.organizationId) {
      const id = parseInt(request.params.organizationId, 10);
      if (!isNaN(id)) {
        return id;
      }
    }

    // Check query parameter
    if (request.query?.organizationId) {
      const id = parseInt(request.query.organizationId, 10);
      if (!isNaN(id)) {
        return id;
      }
    }

    return null;
  }
}


