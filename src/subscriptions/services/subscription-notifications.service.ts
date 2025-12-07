import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { TenantAdminRepository } from '../../admin/repositories/tenant-admin.repository';
import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';

/**
 * Notification Recipient
 * Information about who should receive the notification
 */
export interface NotificationRecipient {
  email: string;
  name: string;
  tenantId: number;
  tenantKey: string;
  tenantName: string;
}

/**
 * Notification Context
 * Additional context for the notification
 */
export interface NotificationContext {
  subscriptionId: number;
  tenantId: number;
  planName: string;
  amount: number;
  currency: string;
  billingCycle: string;
  currentPeriodEnd: Date;
  daysRemaining?: number;
  status?: SubscriptionStatus;
  previousStatus?: SubscriptionStatus;
  reason?: string;
  [key: string]: any;
}

/**
 * Subscription Notification Service
 *
 * Handles all subscription-related notifications:
 * - Expiration warnings (30, 14, 7, 3, 1 days before expiration)
 * - Renewal reminders (before billing period ends)
 * - Payment failure notifications (when payment fails)
 * - Subscription status change notifications (when status changes)
 * - Grace period warnings and expiration notices
 *
 * This service:
 * - Retrieves tenant admin information for notifications
 * - Formats notification messages
 * - Tracks notification history in subscription metadata
 * - Can be extended to integrate with email, SMS, or push notification services
 *
 * For now, notifications are logged. In production, integrate with:
 * - Email service (SendGrid, AWS SES, etc.)
 * - SMS service (Twilio, AWS SNS, etc.)
 * - Push notification service (Firebase, OneSignal, etc.)
 */
@Injectable()
export class SubscriptionNotificationsService {
  private readonly logger = new Logger(SubscriptionNotificationsService.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly tenantAdminRepository: TenantAdminRepository,
  ) {}

  /**
   * Send expiration warning notification
   * Called when subscription is expiring soon
   *
   * @param subscription - Subscription entity
   * @param daysRemaining - Days remaining until expiration
   */
  async sendExpirationWarning(subscription: Subscription, daysRemaining: number): Promise<void> {
    this.logger.log(
      `Sending expiration warning for subscription ID: ${subscription.id}, ${daysRemaining} days remaining`,
    );

    try {
      // Get recipients
      const recipients = await this.getNotificationRecipients(subscription.tenantId);

      // Build notification context
      const context: NotificationContext = {
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
        planName: subscription.plan.planName,
        amount: subscription.amount,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        currentPeriodEnd: subscription.currentPeriodEnd,
        daysRemaining,
      };

      // Send notification to all recipients
      for (const recipient of recipients) {
        await this.sendNotification(
          recipient,
          'subscription.expiration.warning',
          {
            subject: `Subscription Expiring in ${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''}`,
            message: this.formatExpirationWarningMessage(context, daysRemaining),
          },
          context,
        );
      }

      // Update subscription metadata to track notification
      await this.trackNotification(subscription.id, 'expirationWarning', {
        daysRemaining,
        sentAt: new Date().toISOString(),
      });

      this.logger.log(
        `Expiration warning sent for subscription ID: ${subscription.id} to ${recipients.length} recipient(s)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send expiration warning for subscription ID: ${subscription.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Send expiration notice notification
   * Called when subscription has expired
   *
   * @param subscription - Subscription entity
   */
  async sendExpirationNotice(subscription: Subscription): Promise<void> {
    this.logger.log(`Sending expiration notice for subscription ID: ${subscription.id}`);

    try {
      // Get recipients
      const recipients = await this.getNotificationRecipients(subscription.tenantId);

      // Build notification context
      const context: NotificationContext = {
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
        planName: subscription.plan.planName,
        amount: subscription.amount,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        currentPeriodEnd: subscription.currentPeriodEnd,
        status: subscription.status,
      };

      // Send notification to all recipients
      for (const recipient of recipients) {
        await this.sendNotification(
          recipient,
          'subscription.expiration.notice',
          {
            subject: 'Subscription Expired',
            message: this.formatExpirationNoticeMessage(context),
          },
          context,
        );
      }

      // Update subscription metadata to track notification
      await this.trackNotification(subscription.id, 'expirationNotice', {
        sentAt: new Date().toISOString(),
      });

      this.logger.log(
        `Expiration notice sent for subscription ID: ${subscription.id} to ${recipients.length} recipient(s)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send expiration notice for subscription ID: ${subscription.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Send renewal reminder notification
   * Called before subscription renewal date
   *
   * @param subscription - Subscription entity
   * @param daysBeforeRenewal - Days before renewal (default: 7)
   */
  async sendRenewalReminder(
    subscription: Subscription,
    daysBeforeRenewal: number = 7,
  ): Promise<void> {
    this.logger.log(
      `Sending renewal reminder for subscription ID: ${subscription.id}, ${daysBeforeRenewal} days before renewal`,
    );

    try {
      // Get recipients
      const recipients = await this.getNotificationRecipients(subscription.tenantId);

      // Build notification context
      const context: NotificationContext = {
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
        planName: subscription.plan.planName,
        amount: subscription.amount,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        currentPeriodEnd: subscription.currentPeriodEnd,
        daysRemaining: daysBeforeRenewal,
      };

      // Send notification to all recipients
      for (const recipient of recipients) {
        await this.sendNotification(
          recipient,
          'subscription.renewal.reminder',
          {
            subject: `Subscription Renewal in ${daysBeforeRenewal} Day${daysBeforeRenewal !== 1 ? 's' : ''}`,
            message: this.formatRenewalReminderMessage(context, daysBeforeRenewal),
          },
          context,
        );
      }

      // Update subscription metadata to track notification
      await this.trackNotification(subscription.id, 'renewalReminder', {
        daysBeforeRenewal,
        sentAt: new Date().toISOString(),
      });

      this.logger.log(
        `Renewal reminder sent for subscription ID: ${subscription.id} to ${recipients.length} recipient(s)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send renewal reminder for subscription ID: ${subscription.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Send payment failure notification
   * Called when subscription payment fails
   *
   * @param subscription - Subscription entity
   * @param reason - Reason for payment failure (optional)
   */
  async sendPaymentFailureNotification(subscription: Subscription, reason?: string): Promise<void> {
    this.logger.log(`Sending payment failure notification for subscription ID: ${subscription.id}`);

    try {
      // Get recipients
      const recipients = await this.getNotificationRecipients(subscription.tenantId);

      // Build notification context
      const context: NotificationContext = {
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
        planName: subscription.plan.planName,
        amount: subscription.amount,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        currentPeriodEnd: subscription.currentPeriodEnd,
        status: subscription.status,
        reason: reason || 'Payment processing failed',
      };

      // Send notification to all recipients
      for (const recipient of recipients) {
        await this.sendNotification(
          recipient,
          'subscription.payment.failure',
          {
            subject: 'Subscription Payment Failed',
            message: this.formatPaymentFailureMessage(context),
          },
          context,
        );
      }

      // Update subscription metadata to track notification
      await this.trackNotification(subscription.id, 'paymentFailure', {
        reason,
        sentAt: new Date().toISOString(),
      });

      this.logger.log(
        `Payment failure notification sent for subscription ID: ${subscription.id} to ${recipients.length} recipient(s)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send payment failure notification for subscription ID: ${subscription.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Send subscription status change notification
   * Called when subscription status changes
   *
   * @param subscription - Subscription entity
   * @param previousStatus - Previous subscription status
   * @param reason - Reason for status change (optional)
   */
  async sendStatusChangeNotification(
    subscription: Subscription,
    previousStatus: SubscriptionStatus,
    reason?: string,
  ): Promise<void> {
    this.logger.log(
      `Sending status change notification for subscription ID: ${subscription.id}, ${previousStatus} -> ${subscription.status}`,
    );

    try {
      // Get recipients
      const recipients = await this.getNotificationRecipients(subscription.tenantId);

      // Build notification context
      const context: NotificationContext = {
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
        planName: subscription.plan.planName,
        amount: subscription.amount,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        currentPeriodEnd: subscription.currentPeriodEnd,
        status: subscription.status,
        previousStatus,
        reason,
      };

      // Send notification to all recipients
      for (const recipient of recipients) {
        await this.sendNotification(
          recipient,
          'subscription.status.change',
          {
            subject: `Subscription Status Changed to ${subscription.status}`,
            message: this.formatStatusChangeMessage(context),
          },
          context,
        );
      }

      // Update subscription metadata to track notification
      await this.trackNotification(subscription.id, 'statusChange', {
        previousStatus,
        newStatus: subscription.status,
        reason,
        sentAt: new Date().toISOString(),
      });

      this.logger.log(
        `Status change notification sent for subscription ID: ${subscription.id} to ${recipients.length} recipient(s)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send status change notification for subscription ID: ${subscription.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Send grace period warning notification
   * Called when subscription grace period is ending soon
   *
   * @param subscription - Subscription entity
   * @param daysRemaining - Days remaining in grace period
   */
  async sendGracePeriodWarning(subscription: Subscription, daysRemaining: number): Promise<void> {
    this.logger.log(
      `Sending grace period warning for subscription ID: ${subscription.id}, ${daysRemaining} days remaining`,
    );

    try {
      // Get recipients
      const recipients = await this.getNotificationRecipients(subscription.tenantId);

      // Build notification context
      const context: NotificationContext = {
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
        planName: subscription.plan.planName,
        amount: subscription.amount,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        currentPeriodEnd: subscription.currentPeriodEnd,
        gracePeriodEnd: subscription.gracePeriodEnd,
        daysRemaining,
        status: subscription.status,
      };

      // Send notification to all recipients
      for (const recipient of recipients) {
        await this.sendNotification(
          recipient,
          'subscription.grace.period.warning',
          {
            subject: `Grace Period Ending in ${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''}`,
            message: this.formatGracePeriodWarningMessage(context, daysRemaining),
          },
          context,
        );
      }

      // Update subscription metadata to track notification
      await this.trackNotification(subscription.id, 'gracePeriodWarning', {
        daysRemaining,
        sentAt: new Date().toISOString(),
      });

      this.logger.log(
        `Grace period warning sent for subscription ID: ${subscription.id} to ${recipients.length} recipient(s)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send grace period warning for subscription ID: ${subscription.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Send grace period expired notification
   * Called when subscription grace period has expired
   *
   * @param subscription - Subscription entity
   */
  async sendGracePeriodExpired(subscription: Subscription): Promise<void> {
    this.logger.log(`Sending grace period expired notice for subscription ID: ${subscription.id}`);

    try {
      // Get recipients
      const recipients = await this.getNotificationRecipients(subscription.tenantId);

      // Build notification context
      const context: NotificationContext = {
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
        planName: subscription.plan.planName,
        amount: subscription.amount,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
        currentPeriodEnd: subscription.currentPeriodEnd,
        gracePeriodEnd: subscription.gracePeriodEnd,
        status: subscription.status,
      };

      // Send notification to all recipients
      for (const recipient of recipients) {
        await this.sendNotification(
          recipient,
          'subscription.grace.period.expired',
          {
            subject: 'Subscription Grace Period Expired',
            message: this.formatGracePeriodExpiredMessage(context),
          },
          context,
        );
      }

      // Update subscription metadata to track notification
      await this.trackNotification(subscription.id, 'gracePeriodExpired', {
        sentAt: new Date().toISOString(),
      });

      this.logger.log(
        `Grace period expired notice sent for subscription ID: ${subscription.id} to ${recipients.length} recipient(s)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send grace period expired notice for subscription ID: ${subscription.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Get notification recipients for a tenant
   * Returns all active tenant admins for the tenant
   *
   * @param tenantId - Tenant ID
   * @returns Array of notification recipients
   */
  private async getNotificationRecipients(tenantId: number): Promise<NotificationRecipient[]> {
    const tenantAdmins = await this.tenantAdminRepository.findActiveByTenantId(tenantId);

    if (tenantAdmins.length === 0) {
      this.logger.warn(`No active tenant admins found for tenant ID: ${tenantId}`);
      return [];
    }

    return tenantAdmins.map((admin) => ({
      email: admin.email,
      name: admin.fullName,
      tenantId: admin.tenant.id,
      tenantKey: admin.tenant.tenantKey,
      tenantName: admin.tenant.name,
    }));
  }

  /**
   * Send notification to a recipient
   * This is a placeholder that logs the notification
   * In production, integrate with actual notification service
   *
   * @param recipient - Notification recipient
   * @param templateKey - Notification template key
   * @param content - Notification content
   * @param context - Notification context
   */
  private async sendNotification(
    recipient: NotificationRecipient,
    templateKey: string,
    content: { subject: string; message: string },
    context: NotificationContext,
  ): Promise<void> {
    // TODO: Integrate with actual notification service (email, SMS, push, etc.)
    // For now, log the notification
    this.logger.log(
      `[NOTIFICATION] Template: ${templateKey}, Recipient: ${recipient.email} (${recipient.name}), Subject: ${content.subject}`,
    );
    this.logger.debug(`Notification message: ${content.message}`);

    // Example integration points:
    // - Email: await this.emailService.send(recipient.email, content.subject, content.message);
    // - SMS: await this.smsService.send(recipient.phone, content.message);
    // - Push: await this.pushService.send(recipient.deviceToken, content.subject, content.message);
  }

  /**
   * Track notification in subscription metadata
   *
   * @param subscriptionId - Subscription ID
   * @param notificationType - Type of notification
   * @param data - Notification data to store
   */
  private async trackNotification(
    subscriptionId: number,
    notificationType: string,
    data: Record<string, any>,
  ): Promise<void> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      return;
    }

    const metadata = subscription.metadata || {};
    const notifications = metadata.notifications || [];

    notifications.push({
      type: notificationType,
      ...data,
    });

    metadata.notifications = notifications;
    metadata.lastNotificationType = notificationType;
    metadata.lastNotificationDate = new Date().toISOString();

    await this.subscriptionRepository.update(subscriptionId, { metadata });
  }

  /**
   * Format expiration warning message
   */
  private formatExpirationWarningMessage(
    context: NotificationContext,
    daysRemaining: number,
  ): string {
    return `
Your subscription is expiring soon!

Subscription Details:
- Plan: ${context.planName}
- Amount: ${context.currency} ${context.amount}
- Billing Cycle: ${context.billingCycle}
- Expires: ${context.currentPeriodEnd.toLocaleDateString()}
- Days Remaining: ${daysRemaining}

Please renew your subscription to continue using the service.

If you have any questions, please contact support.
    `.trim();
  }

  /**
   * Format expiration notice message
   */
  private formatExpirationNoticeMessage(context: NotificationContext): string {
    return `
Your subscription has expired.

Subscription Details:
- Plan: ${context.planName}
- Amount: ${context.currency} ${context.amount}
- Billing Cycle: ${context.billingCycle}
- Expired: ${context.currentPeriodEnd.toLocaleDateString()}

Your access to the service has been suspended. Please renew your subscription to restore access.

If you have any questions, please contact support.
    `.trim();
  }

  /**
   * Format renewal reminder message
   */
  private formatRenewalReminderMessage(
    context: NotificationContext,
    daysBeforeRenewal: number,
  ): string {
    return `
Your subscription will renew soon.

Subscription Details:
- Plan: ${context.planName}
- Amount: ${context.currency} ${context.amount}
- Billing Cycle: ${context.billingCycle}
- Renewal Date: ${context.currentPeriodEnd.toLocaleDateString()}
- Days Until Renewal: ${daysBeforeRenewal}

Your subscription will automatically renew on ${context.currentPeriodEnd.toLocaleDateString()}.

If you wish to cancel or modify your subscription, please do so before the renewal date.

If you have any questions, please contact support.
    `.trim();
  }

  /**
   * Format payment failure message
   */
  private formatPaymentFailureMessage(context: NotificationContext): string {
    return `
Your subscription payment has failed.

Subscription Details:
- Plan: ${context.planName}
- Amount: ${context.currency} ${context.amount}
- Billing Cycle: ${context.billingCycle}
- Reason: ${context.reason || 'Payment processing failed'}

Please update your payment method to avoid service interruption.

Your subscription is currently in ${context.status} status. If payment is not updated, your subscription may be suspended.

If you have any questions, please contact support.
    `.trim();
  }

  /**
   * Format status change message
   */
  private formatStatusChangeMessage(context: NotificationContext): string {
    return `
Your subscription status has changed.

Subscription Details:
- Plan: ${context.planName}
- Amount: ${context.currency} ${context.amount}
- Billing Cycle: ${context.billingCycle}
- Previous Status: ${context.previousStatus}
- Current Status: ${context.status}
${context.reason ? `- Reason: ${context.reason}` : ''}

If you have any questions about this change, please contact support.
    `.trim();
  }

  /**
   * Format grace period warning message
   */
  private formatGracePeriodWarningMessage(
    context: NotificationContext,
    daysRemaining: number,
  ): string {
    return `
Your subscription grace period is ending soon.

Subscription Details:
- Plan: ${context.planName}
- Amount: ${context.currency} ${context.amount}
- Billing Cycle: ${context.billingCycle}
- Grace Period Ends: ${context.gracePeriodEnd?.toLocaleDateString() || 'N/A'}
- Days Remaining: ${daysRemaining}

Please update your payment method to avoid service interruption.

If payment is not updated before the grace period ends, your subscription will be suspended.

If you have any questions, please contact support.
    `.trim();
  }

  /**
   * Format grace period expired message
   */
  private formatGracePeriodExpiredMessage(context: NotificationContext): string {
    return `
Your subscription grace period has expired.

Subscription Details:
- Plan: ${context.planName}
- Amount: ${context.currency} ${context.amount}
- Billing Cycle: ${context.billingCycle}
- Grace Period Ended: ${context.gracePeriodEnd?.toLocaleDateString() || 'N/A'}

Your subscription has been suspended due to payment failure. Please update your payment method to restore access.

If you have any questions, please contact support.
    `.trim();
  }
}
