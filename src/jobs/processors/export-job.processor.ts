import { Injectable } from '@nestjs/common';
import { BaseJobProcessor } from './base-job.processor';
import { JobQueue } from '../entities/job-queue.entity';

/**
 * Export Job Processor
 *
 * Processes data export jobs.
 */
@Injectable()
export class ExportJobProcessor extends BaseJobProcessor {
  constructor() {
    super(ExportJobProcessor.name);
  }

  async process(jobData: Record<string, any>, job: JobQueue): Promise<any> {
    this.validateJobData(jobData, ['exportType', 'data']);

    this.logger.log(`Processing export job: ${job.id}`);

    // TODO: Integrate with export service
    // For now, just log the export data
    this.logger.debug('Export job data:', jobData);

    return {
      success: true,
      message: 'Export job processed',
      exportData: jobData,
    };
  }
}


