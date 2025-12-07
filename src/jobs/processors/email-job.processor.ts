import { Injectable } from '@nestjs/common';
import { BaseJobProcessor } from './base-job.processor';
import { JobQueue } from '../entities/job-queue.entity';

/**
 * Email Job Processor
 *
 * Processes email sending jobs.
 */
@Injectable()
export class EmailJobProcessor extends BaseJobProcessor {
  constructor() {
    super(EmailJobProcessor.name);
  }

  async process(jobData: Record<string, any>, job: JobQueue): Promise<any> {
    this.validateJobData(jobData, ['to', 'subject']);

    this.logger.log(`Processing email job: ${job.id}`);

    // TODO: Integrate with email service
    // For now, just log the email data
    this.logger.debug('Email job data:', jobData);

    return {
      success: true,
      message: 'Email job processed',
      emailData: jobData,
    };
  }
}

