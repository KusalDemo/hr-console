import { Injectable } from '@nestjs/common';
import { DataSource, Repository, LessThan } from 'typeorm';
import { WebhookEvent, WebhookEventStatus } from '../entities/webhook-event.entity';

/**
 * Webhook Event Repository
 * 
 * Provides custom queries for webhook event operations
 */
@Injectable()
export class WebhookEventRepository extends Repository<WebhookEvent> {
  constructor(private dataSource: DataSource) {
    super(WebhookEvent, dataSource.createEntityManager());
  }

  /**
   * Find event by ID
   */
  async findById(id: number): Promise<WebhookEvent | null> {
    return this.findOne({
      where: { id },
      relations: ['subscription'],
    });
  }

  /**
   * Find pending events for a subscription
   */
  async findPendingBySubscription(subscriptionId: number): Promise<WebhookEvent[]> {
    return this.find({
      where: {
        subscriptionId,
        status: WebhookEventStatus.PENDING,
      },
      order: {
        createdAt: 'ASC',
      },
      take: 100,
    });
  }

  /**
   * Find events ready for retry
   */
  async findReadyForRetry(): Promise<WebhookEvent[]> {
    const now = new Date();
    return this.find({
      where: {
        status: WebhookEventStatus.RETRYING,
        nextRetryAt: LessThan(now),
      },
      relations: ['subscription'],
      order: {
        nextRetryAt: 'ASC',
      },
      take: 100,
    });
  }

  /**
   * Find failed events that should be moved to dead letter queue
   */
  async findForDeadLetter(subscriptionId: number, maxAttempts: number): Promise<WebhookEvent[]> {
    return this.find({
      where: {
        subscriptionId,
        status: WebhookEventStatus.FAILED,
      },
      order: {
        createdAt: 'ASC',
      },
    }).then((events) =>
      events.filter((event) => event.attemptCount >= maxAttempts),
    );
  }

  /**
   * Find events by subscription and status
   */
  async findBySubscriptionAndStatus(
    subscriptionId: number,
    status: WebhookEventStatus,
    limit = 50,
  ): Promise<WebhookEvent[]> {
    return this.find({
      where: {
        subscriptionId,
        status,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * Count events by status for a subscription
   */
  async countByStatus(subscriptionId: number, status: WebhookEventStatus): Promise<number> {
    return this.count({
      where: {
        subscriptionId,
        status,
      },
    });
  }
}
