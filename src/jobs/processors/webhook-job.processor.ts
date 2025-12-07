import { Injectable } from '@nestjs/common';
import { BaseJobProcessor } from './base-job.processor';
import { JobQueue } from '../entities/job-queue.entity';

/**
 * Webhook Job Processor
 * 
 * Processes webhook delivery jobs.
 */
@Injectable()
export class WebhookJobProcessor extends BaseJobProcessor {
  constructor() {
    super(WebhookJobProcessor.name);
  }

  async process(
    jobData: Record<string, any>,
    job: JobQueue,
  ): Promise<any> {
    this.validateJobData(jobData, ['url', 'payload']);

    this.logger.log(`Processing webhook job: ${job.id}`);

    // TODO: Integrate with webhook service
    // For now, just log the webhook data
    this.logger.debug('Webhook job data:', jobData);

    return {
      success: true,
      message: 'Webhook job processed',
      webhookData: jobData,
    };
  }
}
