import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ActivitiesController } from './activities.controller';
import { AuditLogService, AuditRetentionService } from './services';
import { AuditLogRepository } from './repositories';
import { AuditLogSubscriber } from './subscribers/audit-log.subscriber';
import { AuditLog } from './entities';

/**
 * Activities Module
 * 
 * Provides comprehensive audit logging:
 * - Automatic entity lifecycle event logging
 * - Before/after value tracking
 * - Field-level change tracking
 * - Comprehensive metadata (IP, user agent, session)
 * - Audit log retention policies and archival
 * - Compliance export
 * - Configurable audit levels per entity type
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    ScheduleModule.forRoot(), // For scheduled retention tasks
  ],
  controllers: [ActivitiesController],
  providers: [
    AuditLogService,
    AuditRetentionService,
    AuditLogRepository,
    AuditLogSubscriber,
  ],
  exports: [
    AuditLogService,
    AuditRetentionService,
    AuditLogRepository,
  ],
})
export class ActivitiesModule {}
