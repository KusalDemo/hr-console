import { Injectable } from '@nestjs/common';
import { BaseJobProcessor } from './base-job.processor';
import { JobQueue } from '../entities/job-queue.entity';

/**
 * Report Job Processor
 * 
 * Processes report generation jobs.
 */
@Injectable()
export class ReportJobProcessor extends BaseJobProcessor {
  constructor() {
    super(ReportJobProcessor.name);
  }

  async process(
    jobData: Record<string, any>,
    job: JobQueue,
  ): Promise<any> {
    this.validateJobData(jobData, ['reportId']);

    this.logger.log(`Processing report job: ${job.id}`);

    // TODO: Integrate with report service
    // For now, just log the report data
    this.logger.debug('Report job data:', jobData);

    return {
      success: true,
      message: 'Report job processed',
      reportData: jobData,
    };
  }
}
