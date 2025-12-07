import { Injectable } from '@nestjs/common';
import { BaseJobProcessor } from './base-job.processor';
import { JobQueue } from '../entities/job-queue.entity';

/**
 * Calculation Job Processor
 * 
 * Processes calculation jobs (KPI, metrics, etc.).
 */
@Injectable()
export class CalculationJobProcessor extends BaseJobProcessor {
  constructor() {
    super(CalculationJobProcessor.name);
  }

  async process(
    jobData: Record<string, any>,
    job: JobQueue,
  ): Promise<any> {
    this.validateJobData(jobData, ['calculationType']);

    this.logger.log(`Processing calculation job: ${job.id}`);

    // TODO: Integrate with calculation services (KPI, etc.)
    // For now, just log the calculation data
    this.logger.debug('Calculation job data:', jobData);

    return {
      success: true,
      message: 'Calculation job processed',
      calculationData: jobData,
    };
  }
}
