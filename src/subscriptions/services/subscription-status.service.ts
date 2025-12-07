import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';
import {
  BusinessException,
  NotFoundException,
  ErrorCode,
} from '../../common/exceptions/business.exception';

/**
 * Subscription Status Validation Result
 */
export interface SubscriptionStatusResult {
  isValid: boolean;
  hasAccess: boolean;
  subscription: Subscription | null;
  status: SubscriptionStatus | null;
  isActive: boolean;
  isExpired: boolean;
  isInGracePeriod: boolean;
  isTrial: boolean;
  isCanceled: boolean;
  daysRemaining: number | null;
  daysRemainingInGracePeriod: number | null;
  reason: string | null;
  warnings: string[];
}

/**
 * Subscription Status Service
 *
 * Provides subscription status validation and access control:
 * - Check subscription is active
 * - Validate subscription access
 * - Check expiration
 * - Handle grace period
 *
 * This service is used by guards and other services to validate
 * subscription status before allowing access to tenant resources.
 */
@Injectable()
export class SubscriptionStatusService {
  private readonly logger = new Logger(SubscriptionStatusService.name);

  constructor(private readonly subscriptionRepository: SubscriptionRepository) {}

  /**
   * Check if subscription is active for a tenant
   *
   * @param tenantId - Tenant ID
   * @returns True if subscription is active, false otherwise
   */
  async isSubscriptionActive(tenantId: number): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findActiveByTenantId(tenantId);
    if (!subscription) {
      return false;
    }

    return subscription.isActive();
  }

  /**
   * Validate subscription access for a tenant
   *
   * @param tenantId - Tenant ID
   * @param allowGracePeriod - Whether to allow access during grace period (default: true)
   * @returns Subscription status validation result
   */
  async validateSubscriptionAccess(
    tenantId: number,
    allowGracePeriod: boolean = true,
  ): Promise<SubscriptionStatusResult> {
    const result: SubscriptionStatusResult = {
      isValid: false,
      hasAccess: false,
      subscription: null,
      status: null,
      isActive: false,
      isExpired: false,
      isInGracePeriod: false,
      isTrial: false,
      isCanceled: false,
      daysRemaining: null,
      daysRemainingInGracePeriod: null,
      reason: null,
      warnings: [],
    };

    // Find active subscription
    const subscription = await this.subscriptionRepository.findActiveByTenantId(tenantId);
    if (!subscription) {
      result.reason = 'No active subscription found for tenant';
      return result;
    }

    result.subscription = subscription;
    result.status = subscription.status;

    // Check subscription status
    result.isActive = subscription.isActive();
    result.isExpired = subscription.isExpired();
    result.isInGracePeriod = subscription.isInGracePeriod();
    result.isTrial = subscription.isTrial();
    result.isCanceled = subscription.isCanceled();
    result.daysRemaining = subscription.getDaysRemainingInPeriod();
    result.daysRemainingInGracePeriod = subscription.getDaysRemainingInGracePeriod();

    // Determine access based on status
    if (result.isCanceled && !result.isInGracePeriod) {
      result.reason = 'Subscription is canceled';
      return result;
    }

    if (result.isExpired && !result.isInGracePeriod) {
      result.reason = 'Subscription has expired';
      return result;
    }

    if (subscription.status === SubscriptionStatus.SUSPENDED) {
      result.reason = 'Subscription is suspended';
      return result;
    }

    // Check if subscription is in grace period
    if (result.isInGracePeriod) {
      if (allowGracePeriod) {
        result.hasAccess = true;
        result.isValid = true;
        result.warnings.push(
          `Subscription is in grace period. Access will expire in ${result.daysRemainingInGracePeriod} days.`,
        );
        return result;
      } else {
        result.reason = 'Subscription is in grace period and grace period access is not allowed';
        return result;
      }
    }

    // Active or trial subscriptions have access
    if (result.isActive || result.isTrial) {
      result.hasAccess = true;
      result.isValid = true;

      // Add warnings for subscriptions ending soon
      if (result.daysRemaining !== null && result.daysRemaining <= 7) {
        result.warnings.push(
          `Subscription expires in ${result.daysRemaining} days. Please renew to continue service.`,
        );
      }

      // Add warning for subscriptions scheduled to cancel
      if (subscription.willCancelAtPeriodEnd()) {
        result.warnings.push(
          'Subscription is scheduled to cancel at the end of the current billing period.',
        );
      }

      return result;
    }

    // Past due subscriptions
    if (subscription.status === SubscriptionStatus.PAST_DUE) {
      if (result.isInGracePeriod && allowGracePeriod) {
        result.hasAccess = true;
        result.isValid = true;
        result.warnings.push(
          `Subscription is past due but in grace period. Access will expire in ${result.daysRemainingInGracePeriod} days.`,
        );
        return result;
      } else {
        result.reason = 'Subscription is past due';
        return result;
      }
    }

    // Unknown status
    result.reason = `Subscription status is invalid: ${subscription.status}`;
    return result;
  }

  /**
   * Check if subscription has expired
   *
   * @param tenantId - Tenant ID
   * @returns True if subscription is expired, false otherwise
   */
  async isSubscriptionExpired(tenantId: number): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findByTenantId(tenantId);
    if (!subscription) {
      return true; // No subscription means expired
    }

    return subscription.isExpired();
  }

  /**
   * Check if subscription is in grace period
   *
   * @param tenantId - Tenant ID
   * @returns True if subscription is in grace period, false otherwise
   */
  async isSubscriptionInGracePeriod(tenantId: number): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findByTenantId(tenantId);
    if (!subscription) {
      return false;
    }

    return subscription.isInGracePeriod();
  }

  /**
   * Get subscription status information for a tenant
   *
   * @param tenantId - Tenant ID
   * @returns Subscription status information
   */
  async getSubscriptionStatus(tenantId: number): Promise<SubscriptionStatusResult> {
    return this.validateSubscriptionAccess(tenantId, true);
  }

  /**
   * Validate subscription and throw exception if invalid
   *
   * @param tenantId - Tenant ID
   * @param allowGracePeriod - Whether to allow access during grace period (default: true)
   * @throws BusinessException if subscription is invalid
   */
  async validateSubscriptionOrThrow(
    tenantId: number,
    allowGracePeriod: boolean = true,
  ): Promise<Subscription> {
    const result = await this.validateSubscriptionAccess(tenantId, allowGracePeriod);

    if (!result.hasAccess || !result.subscription) {
      const errorMessage = result.reason || 'Subscription is not active or valid for this tenant';
      throw new BusinessException(
        ErrorCode.SUBSCRIPTION_EXPIRED,
        errorMessage,
        403, // Forbidden
      );
    }

    return result.subscription;
  }

  /**
   * Check if subscription can access a feature
   *
   * @param tenantId - Tenant ID
   * @param featureKey - Feature key to check
   * @returns True if feature is available, false otherwise
   */
  async canAccessFeature(tenantId: number, featureKey: string): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findActiveByTenantId(tenantId);
    if (!subscription) {
      return false;
    }

    // Check if subscription is active
    if (!subscription.isActive() && !subscription.isTrial()) {
      return false;
    }

    // Check if plan has the feature
    const plan = subscription.plan;
    if (!plan) {
      return false;
    }

    return plan.hasFeature(featureKey);
  }

  /**
   * Check if subscription has reached user limit
   *
   * @param tenantId - Tenant ID
   * @param currentUserCount - Current number of users
   * @returns True if limit is reached, false otherwise
   */
  async hasReachedUserLimit(tenantId: number, currentUserCount: number): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findActiveByTenantId(tenantId);
    if (!subscription) {
      return true; // No subscription means limit reached
    }

    const plan = subscription.plan;
    if (!plan) {
      return true;
    }

    // Unlimited users
    if (plan.hasUnlimitedUsers()) {
      return false;
    }

    // Check limit
    return plan.maxUsers !== null && currentUserCount >= plan.maxUsers;
  }

  /**
   * Check if subscription has reached organization limit
   *
   * @param tenantId - Tenant ID
   * @param currentOrganizationCount - Current number of organizations
   * @returns True if limit is reached, false otherwise
   */
  async hasReachedOrganizationLimit(
    tenantId: number,
    currentOrganizationCount: number,
  ): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findActiveByTenantId(tenantId);
    if (!subscription) {
      return true; // No subscription means limit reached
    }

    const plan = subscription.plan;
    if (!plan) {
      return true;
    }

    // Unlimited organizations
    if (plan.hasUnlimitedOrganizations()) {
      return false;
    }

    // Check limit
    return plan.maxOrganizations !== null && currentOrganizationCount >= plan.maxOrganizations;
  }

  /**
   * Check if subscription has reached storage limit
   *
   * @param tenantId - Tenant ID
   * @param currentStorageGb - Current storage in GB
   * @returns True if limit is reached, false otherwise
   */
  async hasReachedStorageLimit(tenantId: number, currentStorageGb: number): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findActiveByTenantId(tenantId);
    if (!subscription) {
      return true; // No subscription means limit reached
    }

    const plan = subscription.plan;
    if (!plan) {
      return true;
    }

    // Unlimited storage
    if (plan.hasUnlimitedStorage()) {
      return false;
    }

    // Check limit
    return plan.maxStorageGb !== null && currentStorageGb >= plan.maxStorageGb;
  }

  /**
   * Get days until subscription expires
   *
   * @param tenantId - Tenant ID
   * @returns Number of days until expiration, or null if no subscription
   */
  async getDaysUntilExpiration(tenantId: number): Promise<number | null> {
    const subscription = await this.subscriptionRepository.findActiveByTenantId(tenantId);
    if (!subscription) {
      return null;
    }

    return subscription.getDaysRemainingInPeriod();
  }

  /**
   * Check if subscription needs renewal warning
   *
   * @param tenantId - Tenant ID
   * @param warningDays - Days before expiration to show warning (default: 7)
   * @returns True if warning should be shown, false otherwise
   */
  async needsRenewalWarning(tenantId: number, warningDays: number = 7): Promise<boolean> {
    const daysRemaining = await this.getDaysUntilExpiration(tenantId);
    if (daysRemaining === null) {
      return true; // No subscription means needs warning
    }

    return daysRemaining <= warningDays && daysRemaining > 0;
  }

  /**
   * Check if subscription is expiring soon
   *
   * @param tenantId - Tenant ID
   * @param soonDays - Days threshold for "soon" (default: 7)
   * @returns True if expiring soon, false otherwise
   */
  async isExpiringSoon(tenantId: number, soonDays: number = 7): Promise<boolean> {
    return this.needsRenewalWarning(tenantId, soonDays);
  }
}
