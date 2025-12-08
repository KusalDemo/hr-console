import { Injectable } from '@nestjs/common';
import { BaseJobProcessor } from './base-job.processor';
import { JobQueue } from '../entities/job-queue.entity';

/**
 * Notification Job Processor
 *
 * Processes notification sending jobs.
 */
@Injectable()
export class NotificationJobProcessor extends BaseJobProcessor {
  constructor() {
    super(NotificationJobProcessor.name);
  }

  async process(jobData: Record<string, any>, job: JobQueue): Promise<any> {
    this.validateJobData(jobData, ['userId', 'notificationType']);

    this.logger.log(`Processing notification job: ${job.id}`);

    // TODO: Integrate with notification service
    // For now, just log the notification data
    this.logger.debug('Notification job data:', jobData);

    return {
      success: true,
      message: 'Notification job processed',
      notificationData: jobData,
    };
  }
}


