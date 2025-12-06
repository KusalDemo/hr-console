import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { SubscriptionsService } from '../services/subscriptions.service';
import { Subscription, SubscriptionStatus, PaymentGateway } from '../entities/subscription.entity';
import {
  BusinessException,
  NotFoundException,
  ErrorCode,
} from '../../common/exceptions/business.exception';

/**
 * Webhook Event Types
 * Common webhook events from payment gateways
 */
export enum WebhookEventType {
  // Payment events
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_PENDING = 'payment.pending',
  PAYMENT_REFUNDED = 'payment.refunded',

  // Subscription events
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELED = 'subscription.canceled',
  SUBSCRIPTION_RENEWED = 'subscription.renewed',
  SUBSCRIPTION_EXPIRED = 'subscription.expired',
  SUBSCRIPTION_PAST_DUE = 'subscription.past_due',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription.trial_ending',
  SUBSCRIPTION_TRIAL_ENDED = 'subscription.trial_ended',

  // Invoice events
  INVOICE_CREATED = 'invoice.created',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_PAYMENT_FAILED = 'invoice.payment_failed',
  INVOICE_UPCOMING = 'invoice.upcoming',
}

/**
 * Webhook Event Interface
 * Generic structure for webhook events from payment gateways
 */
export interface WebhookEvent {
  id: string;
  type: WebhookEventType | string;
  gateway: PaymentGateway | string;
  subscriptionId?: string; // Payment gateway subscription ID
  subscription?: {
    id: string;
    status: string;
    currentPeriodStart?: string | Date;
    currentPeriodEnd?: string | Date;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: string | Date;
    trialStart?: string | Date;
    trialEnd?: string | Date;
  };
  payment?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    method?: string;
    failureReason?: string;
  };
  invoice?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    periodStart?: string | Date;
    periodEnd?: string | Date;
  };
  metadata?: Record<string, any>;
  timestamp: string | Date;
  [key: string]: any; // Allow additional gateway-specific fields
}

/**
 * Webhook Processing Result
 */
export interface WebhookProcessingResult {
  success: boolean;
  subscriptionId?: number;
  message: string;
  errors?: string[];
}

/**
 * Subscription Webhook Service
 * 
 * Handles webhooks from payment gateways:
 * - Update subscription status
 * - Process renewals
 * - Handle payment failures
 * - Update billing periods
 * - Handle trial periods
 * 
 * Supports multiple payment gateways (Stripe, PayPal, Razorpay, etc.)
 */
@Injectable()
export class SubscriptionWebhookService {
  private readonly logger = new Logger(SubscriptionWebhookService.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Process webhook event from payment gateway
   * 
   * @param event - Webhook event data
   * @param gateway - Payment gateway source
   * @returns Processing result
   */
  async processWebhook(
    event: WebhookEvent,
    gateway: PaymentGateway | string,
  ): Promise<WebhookProcessingResult> {
    this.logger.log(
      `Processing webhook event: ${event.type} from ${gateway}`,
      { eventId: event.id, gateway },
    );

    try {
      // Normalize event type
      const eventType = this.normalizeEventType(event.type, gateway);

      // Route to appropriate handler based on event type
      switch (eventType) {
        case WebhookEventType.PAYMENT_SUCCEEDED:
        case WebhookEventType.INVOICE_PAID:
          return await this.handlePaymentSucceeded(event, gateway);

        case WebhookEventType.PAYMENT_FAILED:
        case WebhookEventType.INVOICE_PAYMENT_FAILED:
          return await this.handlePaymentFailed(event, gateway);

        case WebhookEventType.SUBSCRIPTION_UPDATED:
          return await this.handleSubscriptionUpdated(event, gateway);

        case WebhookEventType.SUBSCRIPTION_CANCELED:
          return await this.handleSubscriptionCanceled(event, gateway);

        case WebhookEventType.SUBSCRIPTION_RENEWED:
          return await this.handleSubscriptionRenewed(event, gateway);

        case WebhookEventType.SUBSCRIPTION_EXPIRED:
          return await this.handleSubscriptionExpired(event, gateway);

        case WebhookEventType.SUBSCRIPTION_PAST_DUE:
          return await this.handleSubscriptionPastDue(event, gateway);

        case WebhookEventType.SUBSCRIPTION_TRIAL_ENDING:
          return await this.handleTrialEnding(event, gateway);

        case WebhookEventType.SUBSCRIPTION_TRIAL_ENDED:
          return await this.handleTrialEnded(event, gateway);

        case WebhookEventType.SUBSCRIPTION_CREATED:
        case WebhookEventType.INVOICE_CREATED:
        case WebhookEventType.INVOICE_UPCOMING:
          // These events are informational, log but don't require action
          this.logger.debug(`Informational webhook event: ${eventType}`, { event });
          return {
            success: true,
            message: `Event ${eventType} processed (informational)`,
          };

        default:
          this.logger.warn(`Unknown webhook event type: ${eventType}`, { event });
          return {
            success: false,
            message: `Unknown event type: ${eventType}`,
            errors: [`Unsupported event type: ${eventType}`],
          };
      }
    } catch (error) {
      this.logger.error(
        `Error processing webhook event: ${event.type}`,
        error instanceof Error ? error.stack : String(error),
        { event, gateway },
      );

      return {
        success: false,
        message: `Error processing webhook: ${error instanceof Error ? error.message : String(error)}`,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Handle payment succeeded event
   */
  private async handlePaymentSucceeded(
    event: WebhookEvent,
    gateway: PaymentGateway | string,
  ): Promise<WebhookProcessingResult> {
    const subscription = await this.findSubscriptionByGatewayId(
      event.subscriptionId || event.subscription?.id,
      gateway,
    );

    if (!subscription) {
      return {
        success: false,
        message: 'Subscription not found',
        errors: ['Subscription not found for payment gateway ID'],
      };
    }

    // Update subscription status to active if it was past due
    if (subscription.status === SubscriptionStatus.PAST_DUE) {
      await this.subscriptionRepository.updateStatus(subscription.id, SubscriptionStatus.ACTIVE);
      await this.subscriptionRepository.clearGracePeriod(subscription.id);
    }

    // Update payment information
    if (event.payment) {
      await this.subscriptionRepository.updatePaymentGateway(
        subscription.id,
        gateway,
        event.subscriptionId || event.subscription?.id || subscription.paymentGatewaySubscriptionId || '',
        event.payment.method || subscription.paymentMethodId || undefined,
      );
    }

    // Update metadata with payment information
    const metadata = subscription.metadata || {};
    metadata.lastPaymentDate = new Date().toISOString();
    metadata.lastPaymentAmount = event.payment?.amount || subscription.amount;
    metadata.lastPaymentId = event.payment?.id;

    await this.subscriptionRepository.update(subscription.id, { metadata });

    this.logger.log(`Payment succeeded for subscription ID: ${subscription.id}`);

    return {
      success: true,
      subscriptionId: subscription.id,
      message: 'Payment processed successfully',
    };
  }

  /**
   * Handle payment failed event
   */
  private async handlePaymentFailed(
    event: WebhookEvent,
    gateway: PaymentGateway | string,
  ): Promise<WebhookProcessingResult> {
    const subscription = await this.findSubscriptionByGatewayId(
      event.subscriptionId || event.subscription?.id,
      gateway,
    );

    if (!subscription) {
      return {
        success: false,
        message: 'Subscription not found',
        errors: ['Subscription not found for payment gateway ID'],
      };
    }

    // Update subscription status to past due
    if (subscription.status === SubscriptionStatus.ACTIVE || subscription.status === SubscriptionStatus.TRIAL) {
      await this.subscriptionRepository.updateStatus(subscription.id, SubscriptionStatus.PAST_DUE);

      // Set grace period (e.g., 7 days)
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);
      await this.subscriptionRepository.setGracePeriod(subscription.id, gracePeriodEnd);
    }

    // Update metadata with failure information
    const metadata = subscription.metadata || {};
    metadata.lastPaymentFailureDate = new Date().toISOString();
    metadata.lastPaymentFailureReason = event.payment?.failureReason || 'Payment failed';
    metadata.paymentFailureCount = (metadata.paymentFailureCount || 0) + 1;

    await this.subscriptionRepository.update(subscription.id, { metadata });

    this.logger.warn(`Payment failed for subscription ID: ${subscription.id}`, {
      reason: event.payment?.failureReason,
    });

    return {
      success: true,
      subscriptionId: subscription.id,
      message: 'Payment failure processed',
    };
  }

  /**
   * Handle subscription updated event
   */
  private async handleSubscriptionUpdated(
    event: WebhookEvent,
    gateway: PaymentGateway | string,
  ): Promise<WebhookProcessingResult> {
    const subscription = await this.findSubscriptionByGatewayId(
      event.subscriptionId || event.subscription?.id,
      gateway,
    );

    if (!subscription) {
      return {
        success: false,
        message: 'Subscription not found',
        errors: ['Subscription not found for payment gateway ID'],
      };
    }

    // Update billing period if provided
    if (event.subscription?.currentPeriodStart && event.subscription?.currentPeriodEnd) {
      await this.subscriptionRepository.updateBillingPeriod(
        subscription.id,
        new Date(event.subscription.currentPeriodStart),
        new Date(event.subscription.currentPeriodEnd),
      );
    }

    // Update cancel at period end flag
    if (event.subscription?.cancelAtPeriodEnd !== undefined) {
      await this.subscriptionRepository.update(subscription.id, {
        cancelAtPeriodEnd: event.subscription.cancelAtPeriodEnd,
      });
    }

    // Update trial period if provided
    if (event.subscription?.trialStart && event.subscription?.trialEnd) {
      await this.subscriptionRepository.update(subscription.id, {
        trialStart: new Date(event.subscription.trialStart),
        trialEnd: new Date(event.subscription.trialEnd),
      });
    }

    this.logger.log(`Subscription updated for subscription ID: ${subscription.id}`);

    return {
      success: true,
      subscriptionId: subscription.id,
      message: 'Subscription updated successfully',
    };
  }

  /**
   * Handle subscription canceled event
   */
  private async handleSubscriptionCanceled(
    event: WebhookEvent,
    gateway: PaymentGateway | string,
  ): Promise<WebhookProcessingResult> {
    const subscription = await this.findSubscriptionByGatewayId(
      event.subscriptionId || event.subscription?.id,
      gateway,
    );

    if (!subscription) {
      return {
        success: false,
        message: 'Subscription not found',
        errors: ['Subscription not found for payment gateway ID'],
      };
    }

    // Cancel subscription
    await this.subscriptionsService.cancelSubscription(
      subscription.id,
      {
        cancelAtPeriodEnd: event.subscription?.cancelAtPeriodEnd || false,
        reason: 'Canceled via payment gateway webhook',
      },
    );

    this.logger.log(`Subscription canceled for subscription ID: ${subscription.id}`);

    return {
      success: true,
      subscriptionId: subscription.id,
      message: 'Subscription canceled successfully',
    };
  }

  /**
   * Handle subscription renewed event
   */
  private async handleSubscriptionRenewed(
    event: WebhookEvent,
    gateway: PaymentGateway | string,
  ): Promise<WebhookProcessingResult> {
    const subscription = await this.findSubscriptionByGatewayId(
      event.subscriptionId || event.subscription?.id,
      gateway,
    );

    if (!subscription) {
      return {
        success: false,
        message: 'Subscription not found',
        errors: ['Subscription not found for payment gateway ID'],
      };
    }

    // Renew subscription
    await this.subscriptionsService.renewSubscription(
      subscription.id,
      {
        amount: event.payment?.amount || event.invoice?.amount,
        paymentMethodId: event.payment?.method,
      },
    );

    this.logger.log(`Subscription renewed for subscription ID: ${subscription.id}`);

    return {
      success: true,
      subscriptionId: subscription.id,
      message: 'Subscription renewed successfully',
    };
  }

  /**
   * Handle subscription expired event
   */
  private async handleSubscriptionExpired(
    event: WebhookEvent,
    gateway: PaymentGateway | string,
  ): Promise<WebhookProcessingResult> {
    const subscription = await this.findSubscriptionByGatewayId(
      event.subscriptionId || event.subscription?.id,
      gateway,
    );

    if (!subscription) {
      return {
        success: false,
        message: 'Subscription not found',
        errors: ['Subscription not found for payment gateway ID'],
      };
    }

    // Update subscription status to expired
    await this.subscriptionRepository.updateStatus(subscription.id, SubscriptionStatus.EXPIRED);

    this.logger.log(`Subscription expired for subscription ID: ${subscription.id}`);

    return {
      success: true,
      subscriptionId: subscription.id,
      message: 'Subscription expired',
    };
  }

  /**
   * Handle subscription past due event
   */
  private async handleSubscriptionPastDue(
    event: WebhookEvent,
    gateway: PaymentGateway | string,
  ): Promise<WebhookProcessingResult> {
    return this.handlePaymentFailed(event, gateway);
  }

  /**
   * Handle trial ending event (informational)
   */
  private async handleTrialEnding(
    event: WebhookEvent,
    gateway: PaymentGateway | string,
  ): Promise<WebhookProcessingResult> {
    const subscription = await this.findSubscriptionByGatewayId(
      event.subscriptionId || event.subscription?.id,
      gateway,
    );

    if (!subscription) {
      return {
        success: false,
        message: 'Subscription not found',
        errors: ['Subscription not found for payment gateway ID'],
      };
    }

    // Update metadata with trial ending notification
    const metadata = subscription.metadata || {};
    metadata.trialEndingNotificationSent = true;
    metadata.trialEndingNotificationDate = new Date().toISOString();

    await this.subscriptionRepository.update(subscription.id, { metadata });

    this.logger.log(`Trial ending notification for subscription ID: ${subscription.id}`);

    return {
      success: true,
      subscriptionId: subscription.id,
      message: 'Trial ending notification processed',
    };
  }

  /**
   * Handle trial ended event
   */
  private async handleTrialEnded(
    event: WebhookEvent,
    gateway: PaymentGateway | string,
  ): Promise<WebhookProcessingResult> {
    const subscription = await this.findSubscriptionByGatewayId(
      event.subscriptionId || event.subscription?.id,
      gateway,
    );

    if (!subscription) {
      return {
        success: false,
        message: 'Subscription not found',
        errors: ['Subscription not found for payment gateway ID'],
      };
    }

    // Update subscription status from trial to active
    if (subscription.status === SubscriptionStatus.TRIAL) {
      await this.subscriptionRepository.updateStatus(subscription.id, SubscriptionStatus.ACTIVE);
    }

    this.logger.log(`Trial ended for subscription ID: ${subscription.id}`);

    return {
      success: true,
      subscriptionId: subscription.id,
      message: 'Trial ended, subscription activated',
    };
  }

  /**
   * Find subscription by payment gateway subscription ID
   */
  private async findSubscriptionByGatewayId(
    gatewaySubscriptionId: string | undefined,
    gateway: PaymentGateway | string,
  ): Promise<Subscription | null> {
    if (!gatewaySubscriptionId) {
      return null;
    }

    return this.subscriptionRepository.findByPaymentGatewayId(gatewaySubscriptionId);
  }

  /**
   * Normalize event type from different payment gateways
   * Maps gateway-specific event types to standard WebhookEventType
   */
  private normalizeEventType(
    eventType: string,
    gateway: PaymentGateway | string,
  ): WebhookEventType | string {
    // Gateway-specific mappings can be added here
    // For now, return as-is if it matches our enum, otherwise return original
    const normalized = Object.values(WebhookEventType).find(
      (type) => type.toLowerCase() === eventType.toLowerCase(),
    );

    if (normalized) {
      return normalized;
    }

    // Gateway-specific mappings
    switch (gateway.toUpperCase()) {
      case 'STRIPE':
        return this.normalizeStripeEventType(eventType);
      case 'PAYPAL':
        return this.normalizePayPalEventType(eventType);
      case 'RAZORPAY':
        return this.normalizeRazorpayEventType(eventType);
      default:
        return eventType;
    }
  }

  /**
   * Normalize Stripe event types
   */
  private normalizeStripeEventType(eventType: string): WebhookEventType | string {
    const stripeMapping: Record<string, WebhookEventType> = {
      'payment_intent.succeeded': WebhookEventType.PAYMENT_SUCCEEDED,
      'payment_intent.payment_failed': WebhookEventType.PAYMENT_FAILED,
      'customer.subscription.created': WebhookEventType.SUBSCRIPTION_CREATED,
      'customer.subscription.updated': WebhookEventType.SUBSCRIPTION_UPDATED,
      'customer.subscription.deleted': WebhookEventType.SUBSCRIPTION_CANCELED,
      'invoice.payment_succeeded': WebhookEventType.INVOICE_PAID,
      'invoice.payment_failed': WebhookEventType.INVOICE_PAYMENT_FAILED,
      'invoice.upcoming': WebhookEventType.INVOICE_UPCOMING,
    };

    return stripeMapping[eventType] || eventType;
  }

  /**
   * Normalize PayPal event types
   */
  private normalizePayPalEventType(eventType: string): WebhookEventType | string {
    const paypalMapping: Record<string, WebhookEventType> = {
      'PAYMENT.SALE.COMPLETED': WebhookEventType.PAYMENT_SUCCEEDED,
      'PAYMENT.SALE.DENIED': WebhookEventType.PAYMENT_FAILED,
      'BILLING.SUBSCRIPTION.CREATED': WebhookEventType.SUBSCRIPTION_CREATED,
      'BILLING.SUBSCRIPTION.UPDATED': WebhookEventType.SUBSCRIPTION_UPDATED,
      'BILLING.SUBSCRIPTION.CANCELLED': WebhookEventType.SUBSCRIPTION_CANCELED,
    };

    return paypalMapping[eventType] || eventType;
  }

  /**
   * Normalize Razorpay event types
   */
  private normalizeRazorpayEventType(eventType: string): WebhookEventType | string {
    const razorpayMapping: Record<string, WebhookEventType> = {
      'payment.captured': WebhookEventType.PAYMENT_SUCCEEDED,
      'payment.failed': WebhookEventType.PAYMENT_FAILED,
      'subscription.created': WebhookEventType.SUBSCRIPTION_CREATED,
      'subscription.updated': WebhookEventType.SUBSCRIPTION_UPDATED,
      'subscription.cancelled': WebhookEventType.SUBSCRIPTION_CANCELED,
      'invoice.paid': WebhookEventType.INVOICE_PAID,
      'invoice.payment_failed': WebhookEventType.INVOICE_PAYMENT_FAILED,
    };

    return razorpayMapping[eventType] || eventType;
  }
}

