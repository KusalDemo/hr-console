import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsController } from './jobs.controller';
import { JobService, JobProcessorService, JobSchedulerService } from './services';
import {
  JobQueueRepository,
  JobExecutionRepository,
} from './repositories';
import { JobQueue, JobExecution } from './entities';
import {
  EmailJobProcessor,
  ReportJobProcessor,
  ExportJobProcessor,
  ImportJobProcessor,
  NotificationJobProcessor,
  WebhookJobProcessor,
  CalculationJobProcessor,
  CleanupJobProcessor,
} from './processors';

/**
 * Jobs Module
 * 
 * Provides background job processing with:
 * - Job queue management
 * - Job scheduling (one-time and recurring)
 * - Job execution with retry logic
 * - Job monitoring and history
 * - Job dependencies
 * - Multiple job processors
 * - Integration with @nestjs/schedule for cron jobs
 * - Ready for Bull queue integration (when @nestjs/bull is installed)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([JobQueue, JobExecution]),
    ScheduleModule.forRoot(), // For scheduled job processing
  ],
  controllers: [JobsController],
  providers: [
    JobService,
    JobProcessorService,
    JobSchedulerService, // Scheduled job processing
    JobQueueRepository,
    JobExecutionRepository,
    // Job processors
    EmailJobProcessor,
    ReportJobProcessor,
    ExportJobProcessor,
    ImportJobProcessor,
    NotificationJobProcessor,
    WebhookJobProcessor,
    CalculationJobProcessor,
    CleanupJobProcessor,
  ],
  exports: [
    JobService,
    JobProcessorService,
    JobQueueRepository,
    JobExecutionRepository,
  ],
})
export class JobsModule {}
