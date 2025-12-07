import { Injectable, Logger } from '@nestjs/common';
import { JobQueue } from '../entities/job-queue.entity';

/**
 * Base Job Processor
 * 
 * Base class for all job processors.
 */
@Injectable()
export abstract class BaseJobProcessor {
  protected readonly logger: Logger;

  constructor(processorName: string) {
    this.logger = new Logger(processorName);
  }

  /**
   * Process job
   */
  abstract process(
    jobData: Record<string, any>,
    job: JobQueue,
  ): Promise<any>;

  /**
   * Validate job data
   */
  protected validateJobData(
    jobData: Record<string, any>,
    requiredFields: string[],
  ): void {
    for (const field of requiredFields) {
      if (!(field in jobData)) {
        throw new Error(`Required field '${field}' is missing in job data`);
      }
    }
  }
}
