import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksController } from './webhooks.controller';
import { WebhookService, WebhookDeliveryService } from './services';
import { WebhookSubscriptionRepository, WebhookEventRepository } from './repositories';
import { WebhookSubscription, WebhookEvent } from './entities';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationRepository } from '../organizations/repositories/organization.repository';
import { ActivitiesModule } from '../activities/activities.module';

/**
 * Webhooks Module
 *
 * Provides webhook event system with:
 * - Webhook subscription management
 * - Event publishing and delivery
 * - Retry logic and dead letter queue
 * - Webhook testing and replay capabilities
 * - Integration with activity logging for event sourcing
 * - Background job support for webhook delivery
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookSubscription, WebhookEvent, Organization]),
    ActivitiesModule, // For activity logging integration
  ],
  controllers: [WebhooksController],
  providers: [
    WebhookService,
    WebhookDeliveryService,
    WebhookSubscriptionRepository,
    WebhookEventRepository,
    OrganizationRepository,
  ],
  exports: [
    WebhookService,
    WebhookDeliveryService,
    WebhookSubscriptionRepository,
    WebhookEventRepository,
  ],
})
export class WebhooksModule {}
