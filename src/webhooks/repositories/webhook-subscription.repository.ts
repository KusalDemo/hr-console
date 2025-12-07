import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  WebhookSubscription,
  WebhookSubscriptionStatus,
  WebhookEventType,
} from '../entities/webhook-subscription.entity';

/**
 * Webhook Subscription Repository
 *
 * Provides custom queries for webhook subscription operations
 */
@Injectable()
export class WebhookSubscriptionRepository extends Repository<WebhookSubscription> {
  constructor(private dataSource: DataSource) {
    super(WebhookSubscription, dataSource.createEntityManager());
  }

  /**
   * Find subscription by key
   */
  async findByKey(subscriptionKey: string): Promise<WebhookSubscription | null> {
    return this.findOne({
      where: { subscriptionKey },
      relations: ['organization'],
    });
  }

  /**
   * Find subscription by ID
   */
  async findById(id: number): Promise<WebhookSubscription | null> {
    return this.findOne({
      where: { id },
      relations: ['organization'],
    });
  }

  /**
   * Find active subscriptions for an organization
   */
  async findActiveByOrganization(organizationId: number): Promise<WebhookSubscription[]> {
    return this.find({
      where: {
        organizationId,
        isActive: true,
        status: WebhookSubscriptionStatus.ACTIVE,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find subscriptions that match an event type
   */
  async findByEventType(eventType: WebhookEventType): Promise<WebhookSubscription[]> {
    return this.createQueryBuilder('subscription')
      .where('subscription.isActive = :isActive', { isActive: true })
      .andWhere('subscription.status = :status', { status: WebhookSubscriptionStatus.ACTIVE })
      .andWhere('subscription.eventTypes @> :eventType', { eventType: JSON.stringify([eventType]) })
      .getMany();
  }

  /**
   * Find subscriptions that need retry (failed but not dead letter)
   */
  async findNeedingRetry(): Promise<WebhookSubscription[]> {
    return this.find({
      where: {
        isActive: true,
        status: WebhookSubscriptionStatus.ERROR,
      },
      order: {
        lastFailureAt: 'ASC',
      },
      take: 100, // Limit to prevent too many retries at once
    });
  }

  /**
   * Update subscription success stats
   */
  async recordSuccess(id: number): Promise<void> {
    await this.update(id, {
      lastSuccessAt: new Date(),
      successCount: () => 'success_count + 1',
      status: WebhookSubscriptionStatus.ACTIVE,
    });
  }

  /**
   * Update subscription failure stats
   */
  async recordFailure(id: number, reason: string): Promise<void> {
    await this.update(id, {
      lastFailureAt: new Date(),
      lastFailureReason: reason,
      failureCount: () => 'failure_count + 1',
    });
  }
}
