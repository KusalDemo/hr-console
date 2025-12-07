import {
  Injectable,
  NestMiddleware,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Reflector } from '@nestjs/core';
import { OrganizationContextService } from '../services/organization-context.service';
import { TenantContextService } from '../../tenants/services/tenant-context.service';
import { TokenService } from '../../auth/services/token.service';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';

/**
 * Organization Selection Middleware
 * 
 * Extracts organization information from request headers/query and sets organization context.
 * This middleware should run after TenantContextMiddleware but before route handlers.
 * 
 * Features:
 * - Extracts organization from headers (X-Organization, X-Organization-Key) or query parameters
 * - Sets organization context using AsyncLocalStorage
 * - Validates organization access
 * - Handles default organization selection
 * - Skips public routes and super admin requests
 * 
 * Priority for organization resolution:
 * 1. X-Organization header (organization ID)
 * 2. X-Organization-Key header (organization key)
 * 3. organizationId query parameter
 * 4. organizationKey query parameter
 * 5. JWT token organizationId claim
 * 6. User's primary organization
 * 7. Default organization for tenant
 */
@Injectable()
export class OrganizationSelectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(OrganizationSelectionMiddleware.name);

  // Header names for organization selection
  public static readonly ORGANIZATION_HEADER = 'X-Organization';
  public static readonly ORGANIZATION_KEY_HEADER = 'X-Organization-Key';

  constructor(
    private readonly organizationContextService: OrganizationContextService,
    private readonly tenantContextService: TenantContextService,
    private readonly tokenService: TokenService,
    private readonly reflector: Reflector,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip organization context setup for public routes
    if (this.isPublicRoute(req)) {
      return next();
    }

    // Get tenant context (must be set by TenantContextMiddleware)
    const tenantContext = this.tenantContextService.getContext();

    // If no tenant context, skip (will be handled by tenant guard)
    if (!tenantContext) {
      return next();
    }

    // Super admin doesn't need organization context
    if (tenantContext.isSuperAdmin) {
      return next();
    }

    // Extract JWT token to get user information
    const token = this.extractTokenFromRequest(req);
    if (!token) {
      // If no token, skip (will be handled by JWT guard)
      return next();
    }

    try {
      // Decode JWT token to get payload
      const payload = this.tokenService.decodeToken(token);
      if (!payload) {
        // If token is invalid, let JWT guard handle it
        return next();
      }

      // Extract organization from request (headers or query)
      const requestedOrganizationId = this.extractOrganizationIdFromRequest(req);
      const requestedOrganizationKey = this.extractOrganizationKeyFromRequest(req);

      // Create organization context from JWT and request
      const orgContext = await this.organizationContextService.createContextFromJwt(
        payload,
        requestedOrganizationId,
        requestedOrganizationKey,
      );

      // Attach context to request for debugging/logging purposes
      (req as any).organizationContext = orgContext;

      // Run the rest of the request pipeline within the organization context
      await this.organizationContextService.run(orgContext, async () => {
        // Continue to next middleware/handler
        next();
      });
    } catch (error) {
      this.logger.error('Failed to set organization context', {
        error: error instanceof Error ? error.message : String(error),
        path: req.path,
      });

      // If it's a known error, throw it
      if (error instanceof BadRequestException) {
        throw error;
      }

      // For other errors, log and continue (let guards handle validation)
      this.logger.warn('Continuing without organization context due to error');
      next();
    }
  }

  /**
   * Extract organization ID from request
   * Checks headers first, then query parameters
   * 
   * @param req - Express request object
   * @returns Organization ID as string or undefined
   */
  private extractOrganizationIdFromRequest(req: Request): string | undefined {
    // Priority 1: X-Organization header
    const headerValue = req.headers[OrganizationSelectionMiddleware.ORGANIZATION_HEADER.toLowerCase()];
    if (headerValue) {
      const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
      if (value && value.trim()) {
        return value.trim();
      }
    }

    // Priority 2: organizationId query parameter
    if (req.query?.organizationId) {
      const value = Array.isArray(req.query.organizationId)
        ? req.query.organizationId[0]
        : req.query.organizationId;
      if (value && String(value).trim()) {
        return String(value).trim();
      }
    }

    return undefined;
  }

  /**
   * Extract organization key from request
   * Checks headers first, then query parameters
   * 
   * @param req - Express request object
   * @returns Organization key or undefined
   */
  private extractOrganizationKeyFromRequest(req: Request): string | undefined {
    // Priority 1: X-Organization-Key header
    const headerValue = req.headers[
      OrganizationSelectionMiddleware.ORGANIZATION_KEY_HEADER.toLowerCase()
    ];
    if (headerValue) {
      const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
      if (value && value.trim()) {
        return value.trim();
      }
    }

    // Priority 2: organizationKey query parameter
    if (req.query?.organizationKey) {
      const value = Array.isArray(req.query.organizationKey)
        ? req.query.organizationKey[0]
        : req.query.organizationKey;
      if (value && String(value).trim()) {
        return String(value).trim();
      }
    }

    return undefined;
  }

  /**
   * Extract JWT token from Authorization header
   * @param req - Express request object
   * @returns JWT token or null
   */
  private extractTokenFromRequest(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return null;
    }

    // Extract Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Check if route is marked as public
   * Note: This is a simplified check. The actual public route check
   * should be done by the JWT guard, but we check here to avoid
   * unnecessary processing.
   * 
   * @param req - Express request object
   * @returns True if route is public
   */
  private isPublicRoute(req: Request): boolean {
    // Check common public routes
    const publicPaths = ['/auth/login', '/auth/refresh', '/health', '/api/auth'];
    const path = req.path.toLowerCase();

    // Check if path starts with any public path
    return publicPaths.some((publicPath) => path.startsWith(publicPath));
  }
}



