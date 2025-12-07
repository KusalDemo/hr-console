import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { IntegrationsController } from './integrations.controller';
import { IntegrationService, WebhookService } from './services';
import {
  IntegrationRepository,
  IntegrationHealthRepository,
} from './repositories';
import { Integration, IntegrationHealth } from './entities';

/**
 * Integrations Module
 * 
 * Provides external system integration capabilities:
 * - OAuth2 integrations (Slack, Google, etc.)
 * - API key integrations
 * - Webhook integrations
 * - Basic auth integrations
 * - Integration health monitoring
 * - Webhook event publishing
 * - Token refresh for OAuth2
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Integration, IntegrationHealth]),
    ScheduleModule.forRoot(), // For scheduled health checks and token refresh
  ],
  controllers: [IntegrationsController],
  providers: [
    IntegrationService,
    WebhookService,
    IntegrationRepository,
    IntegrationHealthRepository,
  ],
  exports: [
    IntegrationService,
    WebhookService,
    IntegrationRepository,
    IntegrationHealthRepository,
  ],
})
export class IntegrationsModule {}
