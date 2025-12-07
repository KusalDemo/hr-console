import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '../config/config.module';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { TenantsModule } from '../tenants/tenants.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionPlansController } from './subscription-plans.controller';
import { SubscriptionsService } from './services/subscriptions.service';
import { SubscriptionStatusService } from './services/subscription-status.service';
import { SubscriptionRenewalService } from './services/subscription-renewal.service';
import { SubscriptionPlansService } from './services/subscription-plans.service';
import { SubscriptionAnalyticsService } from './services/subscription-analytics.service';
import { SubscriptionNotificationsService } from './services/subscription-notifications.service';
import { SubscriptionWebhookService } from './webhooks/subscription-webhook.service';
import { SubscriptionExpirationJob } from './jobs/subscription-expiration.job';
import { SubscriptionActiveGuard } from './guards/subscription-active.guard';
import { SubscriptionRepository } from './repositories/subscription.repository';
import { SubscriptionPlanRepository } from './repositories/subscription-plan.repository';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { Tenant } from '../admin/entities/tenant.entity';
import { TenantAdmin } from '../admin/entities/tenant-admin.entity';
import { TenantAdminRepository } from '../admin/repositories/tenant-admin.repository';

/**
 * Subscriptions Module
 *
 * Wires up all subscription management components:
 * - Subscription management controller
 * - Subscription services (CRUD, status, renewal, plans, webhooks)
 * - Subscription guards (active subscription validation)
 * - Subscription scheduled jobs (expiration checks)
 * - Subscription repositories
 *
 * This module provides:
 * - Subscription creation and management (super admin only)
 * - Subscription status validation and access control
 * - Subscription renewal processing (automatic and manual)
 * - Subscription plan management and comparison
 * - Payment gateway webhook handling
 * - Subscription expiration monitoring and notifications
 */
@Module({
  imports: [
    // Import ConfigModule for configuration
    ConfigModule,
    // Import DatabaseModule for TypeORM DataSource
    DatabaseModule,
    // Import AuthModule for guards and authentication
    AuthModule,
    // Import TenantsModule for TenantContextService
    TenantsModule,
    // Import ScheduleModule for scheduled jobs
    ScheduleModule.forRoot(),
    // Register Subscription entities for repositories
    TypeOrmModule.forFeature([
      Subscription,
      SubscriptionPlan,
      Tenant, // Needed for subscription relationships
      TenantAdmin, // Needed for notification recipients
    ]),
  ],
  controllers: [SubscriptionsController, SubscriptionPlansController],
  providers: [
    // Services
    SubscriptionsService,
    SubscriptionStatusService,
    SubscriptionRenewalService,
    SubscriptionPlansService,
    SubscriptionAnalyticsService,
    SubscriptionNotificationsService,
    SubscriptionWebhookService,
    // Jobs
    SubscriptionExpirationJob,
    // Guards
    SubscriptionActiveGuard,
    // Repositories
    SubscriptionRepository,
    SubscriptionPlanRepository,
    TenantAdminRepository, // Needed for SubscriptionNotificationsService
  ],
  exports: [
    // Export services for use in other modules
    SubscriptionsService,
    SubscriptionStatusService,
    SubscriptionRenewalService,
    SubscriptionPlansService,
    SubscriptionAnalyticsService,
    SubscriptionNotificationsService,
    SubscriptionWebhookService,
    // Export guards for use in other modules
    SubscriptionActiveGuard,
    // Export repositories for use in other modules
    SubscriptionRepository,
    SubscriptionPlanRepository,
  ],
})
export class SubscriptionsModule {}
