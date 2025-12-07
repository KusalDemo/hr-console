import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationService, NotificationDeliveryService } from './services';
import {
  NotificationTemplateRepository,
  NotificationPreferenceRepository,
  NotificationRepository,
} from './repositories';
import {
  NotificationTemplate,
  NotificationPreference,
  Notification,
} from './entities';
import { Employee } from '../employees/entities/employee.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { EmailModule } from '../email/email.module';

/**
 * Notifications Module
 * 
 * Provides multi-channel notification delivery:
 * - Template management (email, SMS, push, in-app, webhook)
 * - User/tenant notification preferences
 * - Notification delivery with retry logic
 * - Delivery tracking and history
 * - Quiet hours support
 * - Scheduled notifications
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationTemplate,
      NotificationPreference,
      Notification,
      Employee,
      Organization,
    ]),
    ScheduleModule.forRoot(), // For scheduled notification processing
    EmailModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationService,
    NotificationDeliveryService,
    NotificationTemplateRepository,
    NotificationPreferenceRepository,
    NotificationRepository,
  ],
  exports: [
    NotificationService,
    NotificationDeliveryService,
    NotificationTemplateRepository,
    NotificationPreferenceRepository,
    NotificationRepository,
  ],
})
export class NotificationsModule {}
