import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { TenantContextService } from '../services/tenant-context.service';
import { TenantRepository } from '../../admin/repositories/tenant.repository';

/**
 * Tenant Existence Guard
 * 
 * Validates that:
 * - Tenant exists in database
 * - Tenant is active
 * - Subscription is valid (if applicable)
 * 
 * This guard should be used on routes that require a valid tenant context.
 * Super admin requests are automatically allowed (they don't have a tenant).
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, TenantExistsGuard)
 * @Get('some-route')
 * someHandler() { ... }
 */
@Injectable()
export class TenantExistsGuard implements CanActivate {
  private readonly logger = new Logger(TenantExistsGuard.name);

  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly tenantRepository: TenantRepository,
  ) {}

  /**
   * Check if tenant exists and is valid
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get tenant context from AsyncLocalStorage
    const tenantContext = this.tenantContextService.getContext();

    // If no context is set, tenant context middleware may not have run
    // This could happen if the route is public or if middleware wasn't applied
    if (!tenantContext) {
      this.logger.warn('Tenant context not set. Ensure TenantContextMiddleware is applied.');
      throw new ForbiddenException('Tenant context is required');
    }

    // Super admin requests don't need tenant validation
    if (tenantContext.isSuperAdmin) {
      return true;
    }

    // Validate tenant key is present
    if (!tenantContext.tenantKey) {
      this.logger.error('Tenant key is missing in context', { tenantContext });
      throw new ForbiddenException('Tenant key is required');
    }

    // Validate tenant ID is present
    if (!tenantContext.tenantId) {
      this.logger.error('Tenant ID is missing in context', { tenantContext });
      throw new ForbiddenException('Tenant ID is required');
    }

    // Load tenant from database to ensure it still exists and is active
    // This provides an additional layer of validation beyond what the middleware does
    const tenant = await this.tenantRepository.findById(tenantContext.tenantId, false);

    // Check if tenant exists
    if (!tenant) {
      this.logger.error(`Tenant not found: ${tenantContext.tenantId}`, {
        tenantId: tenantContext.tenantId,
        tenantKey: tenantContext.tenantKey,
      });
      throw new NotFoundException(`Tenant not found: ${tenantContext.tenantKey}`);
    }

    // Check if tenant is active
    if (!tenant.isActive) {
      this.logger.warn(`Tenant is inactive: ${tenantContext.tenantKey}`, {
        tenantId: tenantContext.tenantId,
        tenantKey: tenantContext.tenantKey,
      });
      throw new ForbiddenException(
        `Tenant is inactive: ${tenantContext.tenantKey}. Please contact support.`,
      );
    }

    // Validate subscription (if applicable)
    // Note: Subscription validation will be implemented in Phase 5
    // For now, we'll skip this check but leave the structure in place
    const subscriptionValid = await this.validateSubscription(tenantContext.tenantId);
    if (!subscriptionValid) {
      this.logger.warn(`Tenant subscription is invalid: ${tenantContext.tenantKey}`, {
        tenantId: tenantContext.tenantId,
        tenantKey: tenantContext.tenantKey,
      });
      throw new ForbiddenException(
        `Tenant subscription is invalid or expired: ${tenantContext.tenantKey}. Please renew your subscription.`,
      );
    }

    return true;
  }

  /**
   * Validate tenant subscription
   * 
   * Note: Subscription validation is now handled by SubscriptionActiveGuard
   * This method is kept for backward compatibility but always returns true.
   * Use SubscriptionActiveGuard in addition to TenantExistsGuard for subscription validation.
   * 
   * @param tenantId - Tenant ID
   * @returns True if subscription is valid, false otherwise
   */
  private async validateSubscription(tenantId: number): Promise<boolean> {
    // Subscription validation is handled by SubscriptionActiveGuard
    // This guard focuses on tenant existence and active status
    // For subscription validation, use: @UseGuards(JwtAuthGuard, TenantExistsGuard, SubscriptionActiveGuard)
    return true;
  }
}

