import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ImportJobRepository, ImportTemplateRepository } from '../repositories';
import { ImportProcessorService } from './import-processor.service';
import { ImportJob, ImportJobStatus, ImportFormat } from '../entities/import-job.entity';
import { ImportTemplate } from '../entities/import-template.entity';
import {
  CreateImportJobDto,
  CreateImportTemplateDto,
  UpdateImportTemplateDto,
  ImportJobResponseDto,
  ImportTemplateResponseDto,
} from '../dto';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';

/**
 * Import Service
 *
 * Manages import operations:
 * - Import template CRUD
 * - Import job creation and management
 * - Import processing orchestration
 * - Error handling and rollback
 */
@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly importJobRepository: ImportJobRepository,
    private readonly importTemplateRepository: ImportTemplateRepository,
    private readonly importProcessorService: ImportProcessorService,
    private readonly organizationRepository: OrganizationRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create import template
   */
  async createTemplate(
    createDto: CreateImportTemplateDto,
    createdBy?: number,
  ): Promise<ImportTemplateResponseDto> {
    this.logger.log(`Creating import template: ${createDto.name}`);

    // Validate organization exists (if provided)
    if (createDto.organizationId) {
      const organization = await this.organizationRepository.findById(createDto.organizationId);
      if (!organization) {
        throw new NotFoundException(`Organization not found: ${createDto.organizationId}`);
      }
    }

    // Check if template name already exists
    const nameExists = await this.importTemplateRepository.nameExists(
      createDto.name,
      createDto.organizationId || null,
    );
    if (nameExists) {
      throw new BadRequestException(`Template with name '${createDto.name}' already exists`);
    }

    try {
      const template = this.importTemplateRepository.create({
        name: createDto.name,
        description: createDto.description || null,
        entityType: createDto.entityType,
        importFormat: createDto.importFormat || 'CSV',
        organizationId: createDto.organizationId || null,
        fieldMappings: createDto.fieldMappings,
        validationRules: createDto.validationRules || null,
        transformationRules: createDto.transformationRules || null,
        defaultValues: createDto.defaultValues || null,
        duplicateDetection: createDto.duplicateDetection || null,
        mergeStrategy: createDto.mergeStrategy || 'skip',
        rollbackOnFailure: createDto.rollbackOnFailure ?? true,
        batchSize: createDto.batchSize || 100,
        isActive: true,
        isSystem: false,
        metadata: createDto.metadata || null,
        createdBy: createdBy || null,
      });

      const saved = await this.importTemplateRepository.save(template);
      return ImportTemplateResponseDto.fromEntity(saved);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create import template: ${errorMessage}`, error);
      throw new InternalServerErrorException('Failed to create import template');
    }
  }

  /**
   * Get import template by ID
   */
  async getTemplateById(id: number): Promise<ImportTemplateResponseDto> {
    const template = await this.importTemplateRepository.findById(id);
    if (!template) {
      throw new NotFoundException(`Import template not found: ${id}`);
    }
    return ImportTemplateResponseDto.fromEntity(template);
  }

  /**
   * Get templates by entity type
   */
  async getTemplatesByEntityType(
    entityType: string,
    organizationId?: number,
  ): Promise<ImportTemplateResponseDto[]> {
    const templates = await this.importTemplateRepository.findByEntityType(
      entityType,
      organizationId,
    );
    return templates.map((t) => ImportTemplateResponseDto.fromEntity(t));
  }

  /**
   * Update import template
   */
  async updateTemplate(
    id: number,
    updateDto: UpdateImportTemplateDto,
    updatedBy?: number,
  ): Promise<ImportTemplateResponseDto> {
    const template = await this.importTemplateRepository.findById(id);
    if (!template) {
      throw new NotFoundException(`Import template not found: ${id}`);
    }

    if (template.isSystem) {
      throw new BadRequestException('Cannot update system template');
    }

    // Check name uniqueness if name is being updated
    if (updateDto.name && updateDto.name !== template.name) {
      const nameExists = await this.importTemplateRepository.nameExists(
        updateDto.name,
        template.organizationId,
        id,
      );
      if (nameExists) {
        throw new BadRequestException(`Template with name '${updateDto.name}' already exists`);
      }
    }

    try {
      Object.assign(template, {
        ...updateDto,
        updatedBy: updatedBy || null,
      });

      const saved = await this.importTemplateRepository.save(template);
      return ImportTemplateResponseDto.fromEntity(saved);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update import template: ${errorMessage}`, error);
      throw new InternalServerErrorException('Failed to update import template');
    }
  }

  /**
   * Delete import template
   */
  async deleteTemplate(id: number): Promise<void> {
    const template = await this.importTemplateRepository.findById(id);
    if (!template) {
      throw new NotFoundException(`Import template not found: ${id}`);
    }

    if (template.isSystem) {
      throw new BadRequestException('Cannot delete system template');
    }

    // Soft delete by setting isActive to false
    template.isActive = false;
    await this.importTemplateRepository.save(template);
  }

  /**
   * Create import job
   */
  async createImportJob(
    createDto: CreateImportJobDto,
    createdBy?: number,
  ): Promise<ImportJobResponseDto> {
    this.logger.log(`Creating import job for entity: ${createDto.entityType}`);

    // Validate organization exists
    const organization = await this.organizationRepository.findById(createDto.organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization not found: ${createDto.organizationId}`);
    }

    // Validate template exists (if provided)
    let template: ImportTemplate | null = null;
    if (createDto.templateId) {
      template = await this.importTemplateRepository.findById(createDto.templateId);
      if (!template) {
        throw new NotFoundException(`Import template not found: ${createDto.templateId}`);
      }
      if (!template.isActive) {
        throw new BadRequestException('Template is not active');
      }
    }

    try {
      const importJob = this.importJobRepository.create({
        templateId: createDto.templateId || null,
        entityType: createDto.entityType,
        importFormat: createDto.importFormat || ImportFormat.CSV,
        organizationId: createDto.organizationId,
        fileName: createDto.fileName,
        fileSize: createDto.fileSize,
        filePath: createDto.filePath,
        totalRecords: 0,
        processedRecords: 0,
        failedRecords: 0,
        skippedRecords: 0,
        progressPercentage: 0,
        status: ImportJobStatus.PENDING,
        rollbackOnFailure: createDto.rollbackOnFailure ?? true,
        isIncremental: createDto.isIncremental || false,
        duplicateStrategy: createDto.duplicateStrategy || null,
        batchSize: createDto.batchSize || template?.batchSize || 100,
        importConfig: createDto.importConfig || null,
        metadata: createDto.metadata || null,
        createdBy: createdBy || null,
      });

      const saved = await this.importJobRepository.save(importJob);
      return ImportJobResponseDto.fromEntity(saved);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create import job: ${errorMessage}`, error);
      throw new InternalServerErrorException('Failed to create import job');
    }
  }

  /**
   * Get import job by ID
   */
  async getImportJobById(id: number): Promise<ImportJobResponseDto> {
    const job = await this.importJobRepository.findById(id, true);
    if (!job) {
      throw new NotFoundException(`Import job not found: ${id}`);
    }
    return ImportJobResponseDto.fromEntity(job);
  }

  /**
   * Process import job
   * This should be called asynchronously (e.g., via a background job processor)
   */
  async processImportJob(jobId: number): Promise<void> {
    const job = await this.importJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Import job not found: ${jobId}`);
    }

    if (job.status !== ImportJobStatus.PENDING) {
      throw new BadRequestException(
        `Import job is not in PENDING status. Current status: ${job.status}`,
      );
    }

    // Update job status to processing
    job.status = ImportJobStatus.PROCESSING;
    job.startedAt = new Date();
    await this.importJobRepository.save(job);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Parse file
      const rawData = await this.importProcessorService.parseFile(job.filePath, job.importFormat);

      job.totalRecords = rawData.length;
      await this.importJobRepository.save(job);

      // Get template if available
      let template: ImportTemplate | null = null;
      if (job.templateId) {
        template = await this.importTemplateRepository.findById(job.templateId);
      }

      // Transform data
      const transformedData = this.importProcessorService.transformData(rawData, template);

      // Validate data
      const validationErrors = this.importProcessorService.validateData(transformedData, template);

      // Detect duplicates
      const duplicateRows = this.importProcessorService.detectDuplicates(transformedData, template);

      // Process records in batches
      let processedCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      const rowErrors: Array<{ row: number; errors: string[]; data: any }> = [];

      await this.importProcessorService.processBatch(
        transformedData,
        job.batchSize,
        async (batch) => {
          for (let i = 0; i < batch.length; i++) {
            const record = batch[i];
            const rowNumber = processedCount + failedCount + skippedCount + 1;

            // Check if row has validation errors
            const validationError = validationErrors.find((e) => e.row === rowNumber);
            if (validationError) {
              failedCount++;
              rowErrors.push(validationError);
              continue;
            }

            // Check if row is duplicate
            if (duplicateRows.has(rowNumber)) {
              const strategy = job.duplicateStrategy || template?.mergeStrategy || 'skip';
              if (strategy === 'skip') {
                skippedCount++;
                continue;
              } else if (strategy === 'error') {
                failedCount++;
                rowErrors.push({
                  row: rowNumber,
                  errors: ['Duplicate record detected'],
                  data: record,
                });
                continue;
              }
              // For 'update' and 'merge' strategies, continue processing
            }

            try {
              // TODO: Implement entity-specific import logic
              // This would need to be delegated to entity-specific services
              // For now, we'll just mark as processed
              processedCount++;

              // Update progress
              job.processedRecords = processedCount;
              job.failedRecords = failedCount;
              job.skippedRecords = skippedCount;
              job.progressPercentage = job.calculateProgress();
              await this.importJobRepository.save(job);
            } catch (error) {
              failedCount++;
              const errorMessage = error instanceof Error ? error.message : String(error);
              rowErrors.push({
                row: rowNumber,
                errors: [errorMessage || 'Failed to process record'],
                data: record,
              });
            }
          }
        },
      );

      // Commit transaction if no rollback needed
      if (job.rollbackOnFailure && failedCount > 0 && processedCount === 0) {
        await queryRunner.rollbackTransaction();
        job.status = ImportJobStatus.FAILED;
        job.errorMessage = 'Import failed: All records failed validation or processing';
        job.errorDetails = { totalFailed: failedCount, rowErrors };
        job.rowErrors = rowErrors;
      } else {
        await queryRunner.commitTransaction();
        if (failedCount > 0) {
          job.status = ImportJobStatus.PARTIALLY_COMPLETED;
        } else {
          job.status = ImportJobStatus.COMPLETED;
        }
        job.rowErrors = rowErrors.length > 0 ? rowErrors : null;
      }

      job.completedAt = new Date();
      job.processedRecords = processedCount;
      job.failedRecords = failedCount;
      job.skippedRecords = skippedCount;
      job.progressPercentage = job.calculateProgress();
      await this.importJobRepository.save(job);

      this.logger.log(
        `Import job ${jobId} completed: ${processedCount} processed, ${failedCount} failed, ${skippedCount} skipped`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Import job ${jobId} failed: ${errorMessage}`, error);

      job.status = ImportJobStatus.FAILED;
      job.errorMessage = errorMessage;
      job.errorDetails = { error: errorMessage, stack: errorStack ?? null };
      job.completedAt = new Date();
      await this.importJobRepository.save(job);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Cancel import job
   */
  async cancelImportJob(jobId: number): Promise<void> {
    const job = await this.importJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Import job not found: ${jobId}`);
    }

    if (job.status !== ImportJobStatus.PENDING && job.status !== ImportJobStatus.PROCESSING) {
      throw new BadRequestException(`Cannot cancel import job. Current status: ${job.status}`);
    }

    job.status = ImportJobStatus.CANCELLED;
    job.completedAt = new Date();
    await this.importJobRepository.save(job);
  }

  /**
   * Get import jobs with pagination
   */
  async getImportJobs(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: ImportJobStatus;
      entityType?: string;
      organizationId?: number;
    },
  ): Promise<{ jobs: ImportJobResponseDto[]; total: number }> {
    const result = await this.importJobRepository.findWithPagination(page, limit, filters);
    return {
      jobs: result.jobs.map((j) => ImportJobResponseDto.fromEntity(j)),
      total: result.total,
    };
  }

  /**
   * Get import statistics
   */
  async getImportStatistics(organizationId: number): Promise<{
    total: number;
    completed: number;
    failed: number;
    processing: number;
    pending: number;
  }> {
    return this.importJobRepository.getImportStatistics(organizationId);
  }
}
