import { Injectable, Logger } from '@nestjs/common';
import { NotificationRepository } from '../repositories';
import {
  Notification,
  NotificationStatus,
  NotificationChannel,
  NotificationPriority,
} from '../entities';
import { EmailService } from '../../email/email.service';
import { EmployeeRepository } from '../../employees/repositories/employee.repository';

/**
 * Notification Delivery Service
 *
 * Handles actual delivery of notifications:
 * - Email delivery (via EmailService)
 * - SMS delivery (structure for future)
 * - Push notification delivery (structure for future)
 * - In-app notification delivery
 * - Webhook delivery
 * - Retry logic
 * - Delivery tracking
 */
@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);
  private readonly maxRetries = 3;
  private readonly retryDelays = [1000, 5000, 30000]; // 1s, 5s, 30s

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly emailService: EmailService,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  /**
   * Queue notification for delivery
   */
  async queueNotification(notification: Notification): Promise<void> {
    if (notification.scheduledAt && notification.scheduledAt > new Date()) {
      // Scheduled for later, don't deliver now
      notification.status = NotificationStatus.QUEUED;
      await this.notificationRepository.save(notification);
      this.logger.debug(`Notification ${notification.id} queued for scheduled delivery`);
      return;
    }

    // Deliver immediately
    await this.deliverNotification(notification);
  }

  /**
   * Deliver notification
   */
  async deliverNotification(notification: Notification): Promise<void> {
    try {
      this.logger.debug(`Delivering notification ${notification.id} via ${notification.channel}`);

      notification.status = NotificationStatus.QUEUED;
      notification.deliveryAttempts += 1;
      await this.notificationRepository.save(notification);

      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          await this.deliverEmail(notification);
          break;
        case NotificationChannel.SMS:
          await this.deliverSMS(notification);
          break;
        case NotificationChannel.PUSH:
          await this.deliverPush(notification);
          break;
        case NotificationChannel.IN_APP:
          await this.deliverInApp(notification);
          break;
        case NotificationChannel.WEBHOOK:
          await this.deliverWebhook(notification);
          break;
        default:
          throw new Error(`Unsupported notification channel: ${notification.channel}`);
      }

      // Mark as sent
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      await this.notificationRepository.save(notification);

      this.logger.log(`Notification ${notification.id} delivered successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to deliver notification ${notification.id}: ${error instanceof Error ? error.message : String(error)}`,
      );

      await this.handleDeliveryFailure(notification, error);
    }
  }

  /**
   * Deliver email notification
   */
  private async deliverEmail(notification: Notification): Promise<void> {
    if (!notification.recipientEmail) {
      // Try to get email from user
      const user = await this.employeeRepository.findById(notification.userId);
      if (!user || !user.email) {
        throw new Error(`No email address found for user ${notification.userId}`);
      }
      notification.recipientEmail = user.email;
      await this.notificationRepository.save(notification);
    }

    await this.emailService.sendEmail({
      to: notification.recipientEmail,
      subject: notification.title,
      html: notification.body,
      text: this.stripHtml(notification.body),
    });

    // Mark as delivered
    notification.status = NotificationStatus.DELIVERED;
    notification.deliveredAt = new Date();
    await this.notificationRepository.save(notification);
  }

  /**
   * Deliver SMS notification
   */
  private async deliverSMS(notification: Notification): Promise<void> {
    // TODO: Implement SMS delivery (e.g., Twilio, AWS SNS)
    this.logger.warn(`SMS delivery not yet implemented for notification ${notification.id}`);

    // For now, mark as sent (structure for future implementation)
    notification.status = NotificationStatus.SENT;
    notification.sentAt = new Date();
    await this.notificationRepository.save(notification);
  }

  /**
   * Deliver push notification
   */
  private async deliverPush(notification: Notification): Promise<void> {
    // TODO: Implement push notification delivery (e.g., FCM, APNS)
    this.logger.warn(`Push delivery not yet implemented for notification ${notification.id}`);

    // For now, mark as sent (structure for future implementation)
    notification.status = NotificationStatus.SENT;
    notification.sentAt = new Date();
    await this.notificationRepository.save(notification);
  }

  /**
   * Deliver in-app notification
   */
  private async deliverInApp(notification: Notification): Promise<void> {
    // In-app notifications are automatically available once created
    // Just mark as sent/delivered
    notification.status = NotificationStatus.DELIVERED;
    notification.deliveredAt = new Date();
    await this.notificationRepository.save(notification);
  }

  /**
   * Deliver webhook notification
   */
  private async deliverWebhook(notification: Notification): Promise<void> {
    if (!notification.webhookUrl) {
      throw new Error(`No webhook URL provided for notification ${notification.id}`);
    }

    // TODO: Implement webhook delivery with retry logic
    // For now, use fetch API
    try {
      const response = await fetch(notification.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          category: notification.category,
          priority: notification.priority,
          relatedEntityType: notification.relatedEntityType,
          relatedEntityId: notification.relatedEntityId,
          templateVariables: notification.templateVariables,
          metadata: notification.metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
      }

      notification.status = NotificationStatus.DELIVERED;
      notification.deliveredAt = new Date();
      notification.deliveryMetadata = {
        statusCode: response.status,
        responseHeaders: Object.fromEntries(response.headers.entries()),
      };
      await this.notificationRepository.save(notification);
    } catch (error) {
      throw new Error(
        `Webhook delivery failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Handle delivery failure
   */
  private async handleDeliveryFailure(notification: Notification, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (notification.deliveryAttempts >= notification.maxDeliveryAttempts) {
      // Max attempts reached, mark as failed
      notification.status = NotificationStatus.FAILED;
      notification.failedAt = new Date();
      notification.failureReason = errorMessage;
      await this.notificationRepository.save(notification);

      this.logger.error(
        `Notification ${notification.id} failed after ${notification.deliveryAttempts} attempts`,
      );
    } else {
      // Schedule retry
      const retryDelay = this.retryDelays[notification.deliveryAttempts - 1] || 60000;
      notification.status = NotificationStatus.PENDING;
      notification.nextRetryAt = new Date(Date.now() + retryDelay);
      notification.failureReason = errorMessage;
      await this.notificationRepository.save(notification);

      this.logger.warn(
        `Notification ${notification.id} will retry in ${retryDelay}ms (attempt ${notification.deliveryAttempts}/${notification.maxDeliveryAttempts})`,
      );
    }
  }

  /**
   * Process pending notifications (called by scheduled job)
   */
  async processPendingNotifications(limit: number = 100): Promise<void> {
    const pending = await this.notificationRepository.findPending(limit);
    this.logger.debug(`Processing ${pending.length} pending notifications`);

    for (const notification of pending) {
      await this.deliverNotification(notification);
    }
  }

  /**
   * Process retryable notifications (called by scheduled job)
   */
  async processRetryableNotifications(limit: number = 100): Promise<void> {
    const retryable = await this.notificationRepository.findRetryable(limit);
    this.logger.debug(`Processing ${retryable.length} retryable notifications`);

    for (const notification of retryable) {
      await this.deliverNotification(notification);
    }
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }
}
