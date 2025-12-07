import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { WebhookSubscriptionRepository, WebhookEventRepository } from '../repositories';
import {
  WebhookSubscription,
  WebhookSubscriptionStatus,
  WebhookEventType,
} from '../entities/webhook-subscription.entity';
import { WebhookEvent, WebhookEventStatus } from '../entities/webhook-event.entity';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { AuditLogService } from '../../activities/services/audit-log.service';
import { ActorType } from '../../activities/entities/audit-log.entity';
import {
  CreateWebhookSubscriptionDto,
  UpdateWebhookSubscriptionDto,
  TestWebhookDto,
  WebhookSubscriptionResponseDto,
} from '../dto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Webhook Service
 *
 * Manages webhook subscriptions and event publishing:
 * - Subscription CRUD operations
 * - Event publishing
 * - Event filtering
 * - Subscription management
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly subscriptionRepository: WebhookSubscriptionRepository,
    private readonly eventRepository: WebhookEventRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Create webhook subscription
   */
  async createSubscription(
    createDto: CreateWebhookSubscriptionDto,
    createdBy?: number,
  ): Promise<WebhookSubscriptionResponseDto> {
    // Check if subscription key already exists
    const existing = await this.subscriptionRepository.findByKey(createDto.subscriptionKey);
    if (existing) {
      throw new ConflictException(
        `Webhook subscription with key "${createDto.subscriptionKey}" already exists`,
      );
    }

    // Validate organization
    const organization = await this.organizationRepository.findById(createDto.organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization not found: ${createDto.organizationId}`);
    }

    // Validate webhook URL
    try {
      new URL(createDto.webhookUrl);
    } catch {
      throw new BadRequestException(`Invalid webhook URL: ${createDto.webhookUrl}`);
    }

    const subscription = this.subscriptionRepository.create({
      ...createDto,
      createdBy: createdBy || null,
    });

    const saved = await this.subscriptionRepository.save(subscription);

    // Log activity
    await this.auditLogService.createAuditLog({
      activityType: 'WEBHOOK_SUBSCRIPTION_CREATED',
      actorType: ActorType.USER,
      actorId: createdBy,
      targetType: 'WEBHOOK_SUBSCRIPTION',
      targetId: saved.id,
      organizationId: saved.organizationId,
      metadata: {
        subscriptionKey: saved.subscriptionKey,
        webhookUrl: saved.webhookUrl,
        eventTypes: saved.eventTypes,
      },
    });

    this.logger.log(`Created webhook subscription: ${saved.subscriptionKey}`);

    return WebhookSubscriptionResponseDto.fromEntity(saved);
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(id: number): Promise<WebhookSubscriptionResponseDto> {
    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new NotFoundException(`Webhook subscription not found: ${id}`);
    }
    return WebhookSubscriptionResponseDto.fromEntity(subscription);
  }

  /**
   * Get subscription by key
   */
  async getSubscriptionByKey(subscriptionKey: string): Promise<WebhookSubscriptionResponseDto> {
    const subscription = await this.subscriptionRepository.findByKey(subscriptionKey);
    if (!subscription) {
      throw new NotFoundException(`Webhook subscription not found: ${subscriptionKey}`);
    }
    return WebhookSubscriptionResponseDto.fromEntity(subscription);
  }

  /**
   * Get all subscriptions for an organization
   */
  async getSubscriptionsByOrganization(
    organizationId: number,
  ): Promise<WebhookSubscriptionResponseDto[]> {
    const subscriptions = await this.subscriptionRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
    return subscriptions.map((sub) => WebhookSubscriptionResponseDto.fromEntity(sub));
  }

  /**
   * Update webhook subscription
   */
  async updateSubscription(
    id: number,
    updateDto: UpdateWebhookSubscriptionDto,
    updatedBy?: number,
  ): Promise<WebhookSubscriptionResponseDto> {
    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new NotFoundException(`Webhook subscription not found: ${id}`);
    }

    // Validate webhook URL if provided
    if (updateDto.webhookUrl) {
      try {
        new URL(updateDto.webhookUrl);
      } catch {
        throw new BadRequestException(`Invalid webhook URL: ${updateDto.webhookUrl}`);
      }
    }

    // Check subscription key uniqueness if changed
    if (updateDto.subscriptionKey && updateDto.subscriptionKey !== subscription.subscriptionKey) {
      const existing = await this.subscriptionRepository.findByKey(updateDto.subscriptionKey);
      if (existing) {
        throw new ConflictException(
          `Webhook subscription with key "${updateDto.subscriptionKey}" already exists`,
        );
      }
    }

    Object.assign(subscription, updateDto, {
      updatedBy: updatedBy || null,
    });

    const saved = await this.subscriptionRepository.save(subscription);

    // Log activity
    await this.auditLogService.createAuditLog({
      activityType: 'WEBHOOK_SUBSCRIPTION_UPDATED',
      actorType: ActorType.USER,
      actorId: updatedBy,
      targetType: 'WEBHOOK_SUBSCRIPTION',
      targetId: saved.id,
      organizationId: saved.organizationId,
    });

    this.logger.log(`Updated webhook subscription: ${saved.subscriptionKey}`);

    return WebhookSubscriptionResponseDto.fromEntity(saved);
  }

  /**
   * Delete webhook subscription
   */
  async deleteSubscription(id: number, deletedBy?: number): Promise<void> {
    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new NotFoundException(`Webhook subscription not found: ${id}`);
    }

    // Log activity before deletion
    await this.auditLogService.createAuditLog({
      activityType: 'WEBHOOK_SUBSCRIPTION_DELETED',
      actorType: ActorType.USER,
      actorId: deletedBy,
      targetType: 'WEBHOOK_SUBSCRIPTION',
      targetId: subscription.id,
      organizationId: subscription.organizationId,
    });

    await this.subscriptionRepository.remove(subscription);

    this.logger.log(`Deleted webhook subscription: ${subscription.subscriptionKey}`);
  }

  /**
   * Publish webhook event
   * This is called by other services when events occur
   */
  async publishEvent(
    eventType: WebhookEventType,
    payload: Record<string, any>,
    metadata?: Record<string, any>,
  ): Promise<void> {
    // Find all active subscriptions that match this event type
    const subscriptions = await this.subscriptionRepository.findByEventType(eventType);

    if (subscriptions.length === 0) {
      this.logger.debug(`No subscriptions found for event type: ${eventType}`);
      return;
    }

    // Create webhook events for each matching subscription
    const events: WebhookEvent[] = [];

    for (const subscription of subscriptions) {
      // Check event filters if configured
      if (subscription.eventFilters && !this.matchesFilters(payload, subscription.eventFilters)) {
        continue;
      }

      const event = this.eventRepository.create({
        subscriptionId: subscription.id,
        eventType,
        payload,
        metadata: metadata || null,
        status: WebhookEventStatus.PENDING,
        requestId: uuidv4(),
      });

      events.push(event);
    }

    if (events.length > 0) {
      await this.eventRepository.save(events);
      this.logger.log(`Published ${events.length} webhook event(s) for event type: ${eventType}`);
    }
  }

  /**
   * Test webhook subscription
   */
  async testSubscription(
    id: number,
    testDto: TestWebhookDto,
  ): Promise<{ success: boolean; message: string; response?: any }> {
    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new NotFoundException(`Webhook subscription not found: ${id}`);
    }

    // Create a test event
    const testEvent = this.eventRepository.create({
      subscriptionId: subscription.id,
      eventType: testDto.eventType || WebhookEventType.CUSTOM,
      payload: testDto.payload || { test: true, timestamp: new Date().toISOString() },
      metadata: { test: true },
      status: WebhookEventStatus.PENDING,
      requestId: uuidv4(),
    });

    const savedEvent = await this.eventRepository.save(testEvent);

    // The delivery service will pick this up and deliver it
    // For immediate testing, we could call the delivery service directly
    // but for now, we'll let the background job handle it

    return {
      success: true,
      message: 'Test webhook event created and queued for delivery',
      response: {
        eventId: savedEvent.id,
        requestId: savedEvent.requestId,
      },
    };
  }

  /**
   * Check if payload matches event filters
   */
  private matchesFilters(payload: Record<string, any>, filters: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      const payloadValue = this.getNestedValue(payload, key);

      if (Array.isArray(value)) {
        // Check if payload value is in the filter array
        if (!value.includes(payloadValue)) {
          return false;
        }
      } else if (payloadValue !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
