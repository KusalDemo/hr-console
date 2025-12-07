import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import {
  WebhookSubscriptionRepository,
  WebhookEventRepository,
} from '../repositories';
import {
  WebhookSubscription,
  WebhookSubscriptionStatus,
} from '../entities/webhook-subscription.entity';
import {
  WebhookEvent,
  WebhookEventStatus,
} from '../entities/webhook-event.entity';
import { AuditLogService } from '../../activities/services/audit-log.service';

/**
 * Webhook Delivery Service
 * 
 * Handles webhook event delivery:
 * - HTTP request execution
 * - Retry logic
 * - Signature generation
 * - Dead letter queue management
 * - Delivery status tracking
 */
@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);

  constructor(
    private readonly subscriptionRepository: WebhookSubscriptionRepository,
    private readonly eventRepository: WebhookEventRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Process pending webhook events
   * This should be called by a background job/scheduler
   */
  async processPendingEvents(): Promise<void> {
    // Get events ready for retry
    const retryEvents = await this.eventRepository.findReadyForRetry();
    
    // Get pending events (limit to prevent overload)
    const pendingEvents = await this.eventRepository.find({
      where: { status: WebhookEventStatus.PENDING },
      relations: ['subscription'],
      order: { createdAt: 'ASC' },
      take: 100,
    });

    const eventsToProcess = [...retryEvents, ...pendingEvents];

    this.logger.log(`Processing ${eventsToProcess.length} webhook events`);

    for (const event of eventsToProcess) {
      try {
        await this.deliverEvent(event);
      } catch (error) {
        this.logger.error(
          `Failed to process webhook event ${event.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Deliver a single webhook event
   */
  async deliverEvent(event: WebhookEvent): Promise<void> {
    const subscription = await this.subscriptionRepository.findById(event.subscriptionId);
    if (!subscription) {
      this.logger.error(`Subscription not found for event ${event.id}`);
      await this.markEventAsFailed(event, 'Subscription not found');
      return;
    }

    if (!subscription.isActive || subscription.status !== WebhookSubscriptionStatus.ACTIVE) {
      this.logger.warn(`Subscription ${subscription.id} is not active, skipping event ${event.id}`);
      await this.markEventAsFailed(event, 'Subscription is not active');
      return;
    }

    // Check if max retries exceeded
    if (event.attemptCount >= subscription.maxRetries) {
      await this.moveToDeadLetter(event, 'Max retries exceeded');
      return;
    }

    // Update attempt count
    event.attemptCount += 1;
    event.lastAttemptAt = new Date();
    event.status = WebhookEventStatus.RETRYING;
    await this.eventRepository.save(event);

    try {
      const success = await this.sendHttpRequest(subscription, event);

      if (success) {
        await this.markEventAsDelivered(event, subscription);
      } else {
        await this.scheduleRetry(event, subscription);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook delivery failed for event ${event.id}: ${errorMessage}`);
      await this.handleDeliveryFailure(event, subscription, errorMessage);
    }
  }

  /**
   * Send HTTP request to webhook URL
   */
  private async sendHttpRequest(
    subscription: WebhookSubscription,
    event: WebhookEvent,
  ): Promise<boolean> {
    const startTime = Date.now();

    // Build payload
    const payload = {
      event: event.eventType,
      timestamp: event.createdAt.toISOString(),
      requestId: event.requestId,
      data: event.payload,
      metadata: event.metadata,
    };

    const payloadString = JSON.stringify(payload);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'HR-Console-Webhook/1.0',
      ...subscription.customHeaders,
    };

    // Generate signature if secret key is configured
    if (subscription.secretKey) {
      const signature = this.generateSignature(payloadString, subscription.secretKey);
      headers['X-Webhook-Signature'] = signature;
      headers['X-Webhook-Signature-Algorithm'] = 'sha256';
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), subscription.timeoutMs);

      const response = await fetch(subscription.webhookUrl, {
        method: subscription.httpMethod || 'POST',
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text().catch(() => '');
      const executionTime = Date.now() - startTime;

      // Update event with response
      event.lastResponseStatus = response.status;
      event.lastResponseBody = responseBody.substring(0, 1000); // Limit response body size

      // Check if successful (2xx status codes)
      if (response.status >= 200 && response.status < 300) {
        event.deliveredAt = new Date();
        return true;
      } else {
        event.lastError = `HTTP ${response.status}: ${responseBody.substring(0, 200)}`;
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      event.lastError = errorMessage;

      if (error instanceof Error && error.name === 'AbortError') {
        event.lastError = 'Request timeout';
      }

      return false;
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Mark event as delivered
   */
  private async markEventAsDelivered(
    event: WebhookEvent,
    subscription: WebhookSubscription,
  ): Promise<void> {
    event.status = WebhookEventStatus.DELIVERED;
    event.deliveredAt = new Date();
    await this.eventRepository.save(event);

    // Update subscription stats
    await this.subscriptionRepository.recordSuccess(subscription.id);

    // Log activity
    await this.auditLogService.createAuditLog({
      activityType: 'WEBHOOK_DELIVERED',
      actorType: 'SYSTEM',
      targetType: 'WEBHOOK_EVENT',
      targetId: event.id,
      organizationId: subscription.organizationId,
      metadata: {
        subscriptionId: subscription.id,
        eventType: event.eventType,
        requestId: event.requestId,
      },
    });

    this.logger.log(`Webhook event ${event.id} delivered successfully`);
  }

  /**
   * Mark event as failed
   */
  private async markEventAsFailed(event: WebhookEvent, reason: string): Promise<void> {
    event.status = WebhookEventStatus.FAILED;
    event.lastError = reason;
    await this.eventRepository.save(event);
  }

  /**
   * Schedule retry for failed event
   */
  private async scheduleRetry(
    event: WebhookEvent,
    subscription: WebhookSubscription,
  ): Promise<void> {
    if (event.attemptCount >= subscription.maxRetries) {
      await this.moveToDeadLetter(event, 'Max retries exceeded');
      return;
    }

    // Calculate next retry time (exponential backoff)
    const delaySeconds = subscription.retryDelaySeconds * Math.pow(2, event.attemptCount - 1);
    const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

    event.status = WebhookEventStatus.RETRYING;
    event.nextRetryAt = nextRetryAt;
    await this.eventRepository.save(event);

    this.logger.debug(
      `Scheduled retry for event ${event.id} at ${nextRetryAt.toISOString()}`,
    );
  }

  /**
   * Handle delivery failure
   */
  private async handleDeliveryFailure(
    event: WebhookEvent,
    subscription: WebhookSubscription,
    errorMessage: string,
  ): Promise<void> {
    event.lastError = errorMessage;
    await this.eventRepository.save(event);

    // Update subscription failure stats
    await this.subscriptionRepository.recordFailure(subscription.id, errorMessage);

    // Schedule retry or move to dead letter
    if (event.attemptCount >= subscription.maxRetries) {
      await this.moveToDeadLetter(event, 'Max retries exceeded');
    } else {
      await this.scheduleRetry(event, subscription);
    }
  }

  /**
   * Move event to dead letter queue
   */
  private async moveToDeadLetter(event: WebhookEvent, reason: string): Promise<void> {
    event.status = WebhookEventStatus.DEAD_LETTER;
    event.lastError = reason;
    await this.eventRepository.save(event);

    const subscription = await this.subscriptionRepository.findById(event.subscriptionId);
    if (subscription) {
      // Log activity
      await this.auditLogService.createAuditLog({
        activityType: 'WEBHOOK_DEAD_LETTER',
        actorType: 'SYSTEM',
        targetType: 'WEBHOOK_EVENT',
        targetId: event.id,
        organizationId: subscription.organizationId,
        metadata: {
          subscriptionId: subscription.id,
          eventType: event.eventType,
          reason,
          attemptCount: event.attemptCount,
        },
      });
    }

    this.logger.warn(`Webhook event ${event.id} moved to dead letter queue: ${reason}`);
  }

  /**
   * Replay dead letter events
   */
  async replayDeadLetterEvents(subscriptionId: number, limit = 10): Promise<number> {
    const deadLetterEvents = await this.eventRepository.findBySubscriptionAndStatus(
      subscriptionId,
      WebhookEventStatus.DEAD_LETTER,
      limit,
    );

    let replayed = 0;
    for (const event of deadLetterEvents) {
      // Reset event for retry
      event.status = WebhookEventStatus.PENDING;
      event.attemptCount = 0;
      event.nextRetryAt = null;
      event.lastError = null;
      await this.eventRepository.save(event);
      replayed++;
    }

    this.logger.log(`Replayed ${replayed} dead letter events for subscription ${subscriptionId}`);
    return replayed;
  }
}
