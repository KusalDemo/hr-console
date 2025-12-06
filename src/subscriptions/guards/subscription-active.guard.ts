import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from '../../tenants/services/tenant-context.service';
import { SubscriptionStatusService } from '../services/subscription-status.service';

/**
 * Metadata key for allowing grace period access
 */
export const ALLOW_GRACE_PERIOD_KEY = 'allowGracePeriod';

/**
 * Metadata key for bypassing subscription check
 */
export const BYPASS_SUBSCRIPTION_KEY = 'bypassSubscription';

/**
 * Subscription Active Guard
 * 
 * Validates that:
 * - Tenant has an active subscription
 * - Subscription is not expired (or is in grace period if allowed)
 * - Subscription status is valid
 * 
 * This guard should be used on routes that require an active subscription.
 * Super admin requests are automatically allowed (they don't have a subscription).
 * 
 * Grace period handling:
 * - By default, grace period access is allowed
 * - Use @AllowGracePeriod(false) to disallow grace period access
 * - Use @BypassSubscription() to skip subscription validation
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, TenantExistsGuard, SubscriptionActiveGuard)
 * @Get('some-route')
 * someHandler() { ... }
 * 
 * Or with grace period disabled:
 * @UseGuards(JwtAuthGuard, TenantExistsGuard, SubscriptionActiveGuard)
 * @AllowGracePeriod(false)
 * @Get('premium-feature')
 * premiumHandler() { ... }
 */
@Injectable()
export class SubscriptionActiveGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionActiveGuard.name);

  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly subscriptionStatusService: SubscriptionStatusService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Check if tenant has active subscription
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if subscription check should be bypassed
    const bypassSubscription = this.reflector.getAllAndOverride<boolean>(
      BYPASS_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (bypassSubscription) {
      this.logger.debug('Subscription check bypassed');
      return true;
    }

    // Get tenant context from AsyncLocalStorage
    const tenantContext = this.tenantContextService.getContext();

    // If no context is set, tenant context middleware may not have run
    if (!tenantContext) {
      this.logger.warn('Tenant context not set. Ensure TenantContextMiddleware is applied.');
      throw new ForbiddenException('Tenant context is required');
    }

    // Super admin requests don't need subscription validation
    if (tenantContext.isSuperAdmin) {
      this.logger.debug('Super admin request - skipping subscription validation');
      return true;
    }

    // Validate tenant ID is present
    if (!tenantContext.tenantId) {
      this.logger.error('Tenant ID is missing in context', { tenantContext });
      throw new ForbiddenException('Tenant ID is required');
    }

    // Check if grace period is allowed
    const allowGracePeriod = this.reflector.getAllAndOverride<boolean>(
      ALLOW_GRACE_PERIOD_KEY,
      [context.getHandler(), context.getClass()],
    ) ?? true; // Default to true

    // Validate subscription access
    const result = await this.subscriptionStatusService.validateSubscriptionAccess(
      tenantContext.tenantId,
      allowGracePeriod,
    );

    // Check if access is granted
    if (!result.hasAccess) {
      this.logger.warn(
        `Subscription access denied for tenant ID: ${tenantContext.tenantId}`,
        {
          tenantId: tenantContext.tenantId,
          tenantKey: tenantContext.tenantKey,
          reason: result.reason,
          status: result.status,
        },
      );

      // Provide helpful error message
      let errorMessage = 'Subscription is not active or valid';
      if (result.reason) {
        errorMessage = result.reason;
      } else if (result.isExpired) {
        errorMessage = 'Your subscription has expired. Please renew to continue using the service.';
      } else if (result.isCanceled) {
        errorMessage = 'Your subscription has been canceled. Please contact support to reactivate.';
      } else if (result.status === 'SUSPENDED') {
        errorMessage = 'Your subscription has been suspended. Please contact support for assistance.';
      }

      throw new ForbiddenException(errorMessage);
    }

    // Log warnings if any
    if (result.warnings && result.warnings.length > 0) {
      this.logger.warn(
        `Subscription warnings for tenant ID: ${tenantContext.tenantId}`,
        {
          tenantId: tenantContext.tenantId,
          warnings: result.warnings,
        },
      );
    }

    // Add subscription information to request for use in controllers
    const request = context.switchToHttp().getRequest();
    request.subscription = result.subscription;
    request.subscriptionStatus = result;

    return true;
  }
}


