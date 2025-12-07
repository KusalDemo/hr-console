import { Injectable } from '@nestjs/common';
import { BaseJobProcessor } from './base-job.processor';
import { JobQueue } from '../entities/job-queue.entity';

/**
 * Import Job Processor
 *
 * Processes data import jobs.
 */
@Injectable()
export class ImportJobProcessor extends BaseJobProcessor {
  constructor() {
    super(ImportJobProcessor.name);
  }

  async process(jobData: Record<string, any>, job: JobQueue): Promise<any> {
    this.validateJobData(jobData, ['importType', 'data']);

    this.logger.log(`Processing import job: ${job.id}`);

    // TODO: Integrate with import service
    // For now, just log the import data
    this.logger.debug('Import job data:', jobData);

    return {
      success: true,
      message: 'Import job processed',
      importData: jobData,
    };
  }
}

