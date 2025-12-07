import {
  Injectable,
  NestMiddleware,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from '../services/tenant-context.service';
import { TokenService } from '../../auth/services/token.service';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';

/**
 * Tenant Context Middleware
 *
 * Extracts tenant information from JWT token and sets tenant context for the request.
 * This middleware should run after JWT authentication but before route handlers.
 *
 * Features:
 * - Extracts tenant from JWT token
 * - Sets tenant context using AsyncLocalStorage
 * - Validates tenant exists and is active
 * - Handles super admin requests (no tenant)
 * - Skips public routes
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly tokenService: TokenService,
    private readonly reflector: Reflector,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip tenant context setup for public routes
    if (this.isPublicRoute(req)) {
      return next();
    }

    // Extract JWT token from Authorization header
    const token = this.extractTokenFromRequest(req);

    // If no token, skip tenant context (will be handled by JWT guard)
    if (!token) {
      return next();
    }

    try {
      // Decode JWT token to get payload
      const payload = this.tokenService.decodeToken(token);
      if (!payload) {
        // If token is invalid, let JWT guard handle it
        return next();
      }

      // Create tenant context from JWT payload
      const context = await this.tenantContextService.createContextFromJwt(payload);

      // Validate context
      if (!this.tenantContextService.validateContext(context)) {
        this.logger.error('Invalid tenant context', { context });
        throw new BadRequestException('Invalid tenant context');
      }

      // Set tenant context for the request using AsyncLocalStorage
      // We need to wrap the entire request handling in the context
      // Attach context to request for debugging/logging purposes
      (req as any).tenantContext = context;

      // Run the rest of the request pipeline within the tenant context
      await this.tenantContextService.run(context, async () => {
        // Continue to next middleware/handler
        next();
      });
    } catch (error) {
      this.logger.error('Failed to set tenant context', {
        error: error instanceof Error ? error.message : String(error),
        path: req.path,
      });

      // If it's a known error, throw it
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }

      // For other errors, log and continue (let JWT guard handle authentication)
      this.logger.warn('Continuing without tenant context due to error');
      next();
    }
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
