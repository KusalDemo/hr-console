import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';
import { SubscriptionStatusService } from '../services/subscription-status.service';
import { SubscriptionNotificationsService } from '../services/subscription-notifications.service';

/**
 * Subscription Expiration Job
 * 
 * Scheduled job that:
 * - Checks for expiring subscriptions
 * - Sends expiration warnings
 * - Deactivates expired subscriptions
 * - Handles grace period expiration
 * 
 * Runs daily at 2 AM to check subscription statuses
 */
@Injectable()
export class SubscriptionExpirationJob {
  private readonly logger = new Logger(SubscriptionExpirationJob.name);
  private readonly WARNING_DAYS = [30, 14, 7, 3, 1]; // Days before expiration to send warnings
  private readonly GRACE_PERIOD_WARNING_DAYS = [7, 3, 1]; // Days before grace period ends

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionStatusService: SubscriptionStatusService,
    private readonly notificationService: SubscriptionNotificationsService,
  ) {}

  /**
   * Check expiring subscriptions and send warnings
   * Runs daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async checkExpiringSubscriptions(): Promise<void> {
    this.logger.log('Starting subscription expiration check job');

    try {
      // Check for subscriptions expiring at different intervals
      for (const days of this.WARNING_DAYS) {
        await this.processExpiringSubscriptions(days);
      }

      // Check for expired subscriptions
      await this.processExpiredSubscriptions();

      // Check for grace period expiring
      await this.processGracePeriodExpiring();

      // Check for grace period expired
      await this.processGracePeriodExpired();

      this.logger.log('Subscription expiration check job completed');
    } catch (error) {
      this.logger.error(
        'Error in subscription expiration check job',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Process subscriptions expiring in N days
   */
  private async processExpiringSubscriptions(days: number): Promise<void> {
    this.logger.debug(`Checking subscriptions expiring in ${days} days`);

    const subscriptions = await this.subscriptionRepository.findExpiringSoon(days);

    for (const subscription of subscriptions) {
      try {
        const daysRemaining = subscription.getDaysRemainingInPeriod();

        // Only process if exactly N days remaining (to avoid duplicate notifications)
        if (daysRemaining === days) {
          await this.sendExpirationWarning(subscription, daysRemaining);
        }
      } catch (error) {
        this.logger.error(
          `Error processing expiring subscription ID: ${subscription.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  /**
   * Process expired subscriptions
   */
  private async processExpiredSubscriptions(): Promise<void> {
    this.logger.debug('Checking for expired subscriptions');

    const expiredSubscriptions = await this.subscriptionRepository.findExpired();

    for (const subscription of expiredSubscriptions) {
      try {
        // Check if subscription is actually expired
        if (subscription.isExpired() && subscription.status === SubscriptionStatus.ACTIVE) {
          this.logger.warn(
            `Expired subscription found: ID ${subscription.id}, Tenant ID: ${subscription.tenantId}`,
          );

          // Send expiration notice
          await this.sendExpirationNotice(subscription);

          // Update subscription status to expired
          await this.subscriptionRepository.updateStatus(
            subscription.id,
            SubscriptionStatus.EXPIRED,
          );

          this.logger.log(
            `Subscription ID ${subscription.id} marked as expired`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error processing expired subscription ID: ${subscription.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  /**
   * Process subscriptions with grace period expiring soon
   */
  private async processGracePeriodExpiring(): Promise<void> {
    this.logger.debug('Checking for subscriptions with grace period expiring soon');

    for (const days of this.GRACE_PERIOD_WARNING_DAYS) {
      const subscriptions = await this.subscriptionRepository.findGracePeriodEndingSoon(days);

      for (const subscription of subscriptions) {
        try {
          const daysRemaining = subscription.getDaysRemainingInGracePeriod();

          // Only process if exactly N days remaining
          if (daysRemaining === days) {
            await this.sendGracePeriodWarning(subscription, daysRemaining);
          }
        } catch (error) {
          this.logger.error(
            `Error processing grace period expiring subscription ID: ${subscription.id}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    }
  }

  /**
   * Process subscriptions with expired grace period
   */
  private async processGracePeriodExpired(): Promise<void> {
    this.logger.debug('Checking for subscriptions with expired grace period');

    const subscriptions = await this.subscriptionRepository.findInGracePeriod();
    const now = new Date();

    for (const subscription of subscriptions) {
      try {
        // Check if grace period has expired
        if (
          subscription.gracePeriodEnd &&
          subscription.gracePeriodEnd <= now &&
          subscription.status === SubscriptionStatus.PAST_DUE
        ) {
          this.logger.warn(
            `Grace period expired for subscription ID: ${subscription.id}, Tenant ID: ${subscription.tenantId}`,
          );

          // Send grace period expired notice
          await this.sendGracePeriodExpired(subscription);

          // Update subscription status to expired
          await this.subscriptionRepository.updateStatus(
            subscription.id,
            SubscriptionStatus.EXPIRED,
          );

          // Clear grace period
          await this.subscriptionRepository.clearGracePeriod(subscription.id);

          this.logger.log(
            `Subscription ID ${subscription.id} grace period expired, marked as expired`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error processing grace period expired subscription ID: ${subscription.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  /**
   * Send expiration warning notification
   */
  private async sendExpirationWarning(
    subscription: Subscription,
    daysRemaining: number,
  ): Promise<void> {
    this.logger.log(
      `Sending expiration warning for subscription ID: ${subscription.id}, ${daysRemaining} days remaining`,
    );

    // Update metadata to track notification
    const metadata = subscription.metadata || {};
    const warningKey = `expirationWarning${daysRemaining}Days`;
    const lastWarningDate = metadata[warningKey];

    // Only send if not already sent today
    const today = new Date().toISOString().split('T')[0];
    if (lastWarningDate && lastWarningDate.startsWith(today)) {
      this.logger.debug(
        `Expiration warning already sent today for subscription ID: ${subscription.id}`,
      );
      return;
    }

    metadata[warningKey] = new Date().toISOString();
    metadata.lastExpirationWarningDate = new Date().toISOString();
    metadata.lastExpirationWarningDays = daysRemaining;

    await this.subscriptionRepository.update(subscription.id, { metadata });

    // Send notification via notification service
    await this.notificationService.sendExpirationWarning(subscription, daysRemaining);

    this.logger.log(
      `Expiration warning sent for subscription ID: ${subscription.id}`,
    );
  }

  /**
   * Send expiration notice notification
   */
  private async sendExpirationNotice(subscription: Subscription): Promise<void> {
    this.logger.log(
      `Sending expiration notice for subscription ID: ${subscription.id}`,
    );

    // Update metadata to track notification
    const metadata = subscription.metadata || {};
    metadata.expirationNoticeSent = true;
    metadata.expirationNoticeDate = new Date().toISOString();

    await this.subscriptionRepository.update(subscription.id, { metadata });

    // Send notification via notification service
    await this.notificationService.sendExpirationNotice(subscription);

    this.logger.log(`Expiration notice sent for subscription ID: ${subscription.id}`);
  }

  /**
   * Send grace period warning notification
   */
  private async sendGracePeriodWarning(
    subscription: Subscription,
    daysRemaining: number,
  ): Promise<void> {
    this.logger.log(
      `Sending grace period warning for subscription ID: ${subscription.id}, ${daysRemaining} days remaining`,
    );

    // Update metadata to track notification
    const metadata = subscription.metadata || {};
    const warningKey = `gracePeriodWarning${daysRemaining}Days`;
    const lastWarningDate = metadata[warningKey];

    // Only send if not already sent today
    const today = new Date().toISOString().split('T')[0];
    if (lastWarningDate && lastWarningDate.startsWith(today)) {
      this.logger.debug(
        `Grace period warning already sent today for subscription ID: ${subscription.id}`,
      );
      return;
    }

    metadata[warningKey] = new Date().toISOString();
    metadata.lastGracePeriodWarningDate = new Date().toISOString();
    metadata.lastGracePeriodWarningDays = daysRemaining;

    await this.subscriptionRepository.update(subscription.id, { metadata });

    // Send notification via notification service
    await this.notificationService.sendGracePeriodWarning(subscription, daysRemaining);

    this.logger.log(
      `Grace period warning sent for subscription ID: ${subscription.id}`,
    );
  }

  /**
   * Send grace period expired notification
   */
  private async sendGracePeriodExpired(subscription: Subscription): Promise<void> {
    this.logger.log(
      `Sending grace period expired notice for subscription ID: ${subscription.id}`,
    );

    // Update metadata to track notification
    const metadata = subscription.metadata || {};
    metadata.gracePeriodExpiredNoticeSent = true;
    metadata.gracePeriodExpiredNoticeDate = new Date().toISOString();

    await this.subscriptionRepository.update(subscription.id, { metadata });

    // Send notification via notification service
    await this.notificationService.sendGracePeriodExpired(subscription);

    this.logger.log(
      `Grace period expired notice sent for subscription ID: ${subscription.id}`,
    );
  }

  /**
   * Manual trigger for testing
   * Can be called from admin endpoint for manual execution
   */
  async runManually(): Promise<{
    processed: number;
    expired: number;
    warnings: number;
    errors: number;
  }> {
    this.logger.log('Manually triggering subscription expiration check job');

    const stats = {
      processed: 0,
      expired: 0,
      warnings: 0,
      errors: 0,
    };

    try {
      // Process expiring subscriptions
      for (const days of this.WARNING_DAYS) {
        const subscriptions = await this.subscriptionRepository.findExpiringSoon(days);
        stats.processed += subscriptions.length;
        stats.warnings += subscriptions.length;
        await this.processExpiringSubscriptions(days);
      }

      // Process expired subscriptions
      const expired = await this.subscriptionRepository.findExpired();
      stats.expired = expired.length;
      await this.processExpiredSubscriptions();

      // Process grace period
      await this.processGracePeriodExpiring();
      await this.processGracePeriodExpired();

      this.logger.log('Manual subscription expiration check completed', stats);
    } catch (error) {
      stats.errors++;
      this.logger.error(
        'Error in manual subscription expiration check',
        error instanceof Error ? error.stack : String(error),
      );
    }

    return stats;
  }
}

