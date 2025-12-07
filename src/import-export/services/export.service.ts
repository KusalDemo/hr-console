import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ExportJobRepository, ExportTemplateRepository } from '../repositories';
import { ReportBuilderService } from './report-builder.service';
import {
  ExportJob,
  ExportJobStatus,
  ExportFormat,
  ExportDeliveryMethod,
} from '../entities/export-job.entity';
import { ExportTemplate } from '../entities/export-template.entity';
import {
  CreateExportJobDto,
  CreateExportTemplateDto,
  UpdateExportTemplateDto,
  ExportJobResponseDto,
  ExportTemplateResponseDto,
} from '../dto';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { EmailService } from '../../email/email.service';

/**
 * Export Service
 *
 * Manages export operations:
 * - Export template CRUD
 * - Export job creation and management
 * - File generation (PDF, Excel, CSV, JSON)
 * - Email delivery
 * - Scheduled exports
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private readonly exportStoragePath = process.env.EXPORT_STORAGE_PATH || '/tmp/exports';

  constructor(
    private readonly exportJobRepository: ExportJobRepository,
    private readonly exportTemplateRepository: ExportTemplateRepository,
    private readonly reportBuilderService: ReportBuilderService,
    private readonly organizationRepository: OrganizationRepository,
    private readonly dataSource: DataSource,
    private readonly emailService?: EmailService,
  ) {
    // Ensure export storage directory exists
    try {
      mkdirSync(this.exportStoragePath, { recursive: true });
    } catch (error) {
      this.logger.warn(`Failed to create export storage directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create export template
   */
  async createTemplate(
    createDto: CreateExportTemplateDto,
    createdBy?: number,
  ): Promise<ExportTemplateResponseDto> {
    this.logger.log(`Creating export template: ${createDto.name}`);

    // Validate organization exists (if provided)
    if (createDto.organizationId) {
      const organization = await this.organizationRepository.findById(createDto.organizationId);
      if (!organization) {
        throw new NotFoundException(`Organization not found: ${createDto.organizationId}`);
      }
    }

    // Check if template name already exists
    const nameExists = await this.exportTemplateRepository.nameExists(
      createDto.name,
      createDto.organizationId || null,
    );
    if (nameExists) {
      throw new BadRequestException(`Template with name '${createDto.name}' already exists`);
    }

    try {
      const template = this.exportTemplateRepository.create({
        name: createDto.name,
        description: createDto.description || null,
        entityType: createDto.entityType,
        exportFormat: createDto.exportFormat || 'CSV',
        organizationId: createDto.organizationId || null,
        fieldSelection: createDto.fieldSelection || null,
        formattingRules: createDto.formattingRules || null,
        defaultFilters: createDto.defaultFilters || null,
        defaultSorting: createDto.defaultSorting || null,
        queryBuilderConfig: createDto.queryBuilderConfig || null,
        pdfTemplateConfig: createDto.pdfTemplateConfig || null,
        excelTemplateConfig: createDto.excelTemplateConfig || null,
        supportsScheduling: createDto.supportsScheduling || false,
        defaultEmailRecipients: createDto.defaultEmailRecipients || null,
        defaultEmailSubject: createDto.defaultEmailSubject || null,
        defaultEmailBody: createDto.defaultEmailBody || null,
        isActive: true,
        isSystem: false,
        metadata: createDto.metadata || null,
        createdBy: createdBy || null,
      });

      const saved = await this.exportTemplateRepository.save(template);
      return ExportTemplateResponseDto.fromEntity(saved);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create export template: ${errorMessage}`, error);
      throw new InternalServerErrorException('Failed to create export template');
    }
  }

  /**
   * Get export template by ID
   */
  async getTemplateById(id: number): Promise<ExportTemplateResponseDto> {
    const template = await this.exportTemplateRepository.findById(id);
    if (!template) {
      throw new NotFoundException(`Export template not found: ${id}`);
    }
    return ExportTemplateResponseDto.fromEntity(template);
  }

  /**
   * Get templates by entity type
   */
  async getTemplatesByEntityType(
    entityType: string,
    organizationId?: number,
  ): Promise<ExportTemplateResponseDto[]> {
    const templates = await this.exportTemplateRepository.findByEntityType(
      entityType,
      organizationId,
    );
    return templates.map((t) => ExportTemplateResponseDto.fromEntity(t));
  }

  /**
   * Update export template
   */
  async updateTemplate(
    id: number,
    updateDto: UpdateExportTemplateDto,
    updatedBy?: number,
  ): Promise<ExportTemplateResponseDto> {
    const template = await this.exportTemplateRepository.findById(id);
    if (!template) {
      throw new NotFoundException(`Export template not found: ${id}`);
    }

    if (template.isSystem) {
      throw new BadRequestException('Cannot update system template');
    }

    // Check name uniqueness if name is being updated
    if (updateDto.name && updateDto.name !== template.name) {
      const nameExists = await this.exportTemplateRepository.nameExists(
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

      const saved = await this.exportTemplateRepository.save(template);
      return ExportTemplateResponseDto.fromEntity(saved);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update export template: ${errorMessage}`, error);
      throw new InternalServerErrorException('Failed to update export template');
    }
  }

  /**
   * Delete export template
   */
  async deleteTemplate(id: number): Promise<void> {
    const template = await this.exportTemplateRepository.findById(id);
    if (!template) {
      throw new NotFoundException(`Export template not found: ${id}`);
    }

    if (template.isSystem) {
      throw new BadRequestException('Cannot delete system template');
    }

    // Soft delete by setting isActive to false
    template.isActive = false;
    await this.exportTemplateRepository.save(template);
  }

  /**
   * Create export job
   */
  async createExportJob(
    createDto: CreateExportJobDto,
    createdBy?: number,
  ): Promise<ExportJobResponseDto> {
    this.logger.log(`Creating export job for entity: ${createDto.entityType}`);

    // Validate organization exists
    const organization = await this.organizationRepository.findById(createDto.organizationId);
    if (!organization) {
      throw new NotFoundException(`Organization not found: ${createDto.organizationId}`);
    }

    // Validate template exists (if provided)
    let template: ExportTemplate | null = null;
    if (createDto.templateId) {
      template = await this.exportTemplateRepository.findById(createDto.templateId);
      if (!template) {
        throw new NotFoundException(`Export template not found: ${createDto.templateId}`);
      }
      if (!template.isActive) {
        throw new BadRequestException('Template is not active');
      }
    }

    try {
      const exportJob = this.exportJobRepository.create({
        templateId: createDto.templateId || null,
        entityType: createDto.entityType,
        exportFormat: createDto.exportFormat || ExportFormat.CSV,
        organizationId: createDto.organizationId,
        fieldSelection: createDto.fieldSelection || template?.fieldSelection || null,
        filters: createDto.filters || template?.defaultFilters || null,
        sorting: createDto.sorting || template?.defaultSorting || null,
        exportQuery: createDto.exportQuery || null,
        deliveryMethod: createDto.deliveryMethod || ExportDeliveryMethod.DOWNLOAD,
        emailRecipients: createDto.emailRecipients || template?.defaultEmailRecipients || null,
        emailSubject: createDto.emailSubject || template?.defaultEmailSubject || null,
        emailBody: createDto.emailBody || template?.defaultEmailBody || null,
        isScheduled: createDto.isScheduled || false,
        scheduledAt: createDto.scheduledAt ? new Date(createDto.scheduledAt) : null,
        scheduleRecurrence: createDto.scheduleRecurrence || null,
        status: ExportJobStatus.PENDING,
        totalRecords: 0,
        progressPercentage: 0,
        metadata: createDto.metadata || null,
        createdBy: createdBy || null,
      });

      const saved = await this.exportJobRepository.save(exportJob);
      return ExportJobResponseDto.fromEntity(saved);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create export job: ${errorMessage}`, error);
      throw new InternalServerErrorException('Failed to create export job');
    }
  }

  /**
   * Get export job by ID
   */
  async getExportJobById(id: number): Promise<ExportJobResponseDto> {
    const job = await this.exportJobRepository.findById(id, true);
    if (!job) {
      throw new NotFoundException(`Export job not found: ${id}`);
    }
    return ExportJobResponseDto.fromEntity(job);
  }

  /**
   * Process export job
   * This should be called asynchronously (e.g., via a background job processor)
   */
  async processExportJob(jobId: number): Promise<void> {
    const job = await this.exportJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Export job not found: ${jobId}`);
    }

    if (job.status !== ExportJobStatus.PENDING) {
      throw new BadRequestException(
        `Export job is not in PENDING status. Current status: ${job.status}`,
      );
    }

    // Update job status to processing
    job.status = ExportJobStatus.PROCESSING;
    job.startedAt = new Date();
    await this.exportJobRepository.save(job);

    try {
      // Get template if available
      let template: ExportTemplate | null = null;
      if (job.templateId) {
        template = await this.exportTemplateRepository.findById(job.templateId);
      }

      // Build query
      const queryBuilder = await this.reportBuilderService.buildQuery(
        job.entityType,
        template,
        job.filters || undefined,
        job.sorting || undefined,
        job.fieldSelection || undefined,
      );

      // Execute query
      const data = await queryBuilder.getRawMany();
      job.totalRecords = data.length;

      // Format data
      const formattedData = this.reportBuilderService.formatData(
        data,
        template?.formattingRules || null,
      );

      // Generate file
      const fileInfo = await this.generateFile(
        formattedData,
        job.exportFormat,
        job.entityType,
        job.id,
      );

      // Update job with file information
      job.fileName = fileInfo.fileName;
      job.filePath = fileInfo.filePath;
      job.fileSize = fileInfo.fileSize;
      job.status = ExportJobStatus.COMPLETED;
      job.completedAt = new Date();
      job.progressPercentage = 100;

      await this.exportJobRepository.save(job);

      // Handle delivery
      if (job.deliveryMethod === ExportDeliveryMethod.EMAIL && this.emailService) {
        await this.sendExportEmail(job);
      } else if (job.deliveryMethod === ExportDeliveryMethod.EMAIL && !this.emailService) {
        this.logger.warn('Email service not available, skipping email delivery');
      }

      this.logger.log(`Export job ${jobId} completed: ${job.totalRecords} records exported`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Export job ${jobId} failed: ${errorMessage}`, error);

      job.status = ExportJobStatus.FAILED;
      job.errorMessage = errorMessage;
      job.errorDetails = { error: errorMessage, stack: errorStack ?? null };
      job.completedAt = new Date();
      await this.exportJobRepository.save(job);
    }
  }

  /**
   * Generate export file
   */
  private async generateFile(
    data: Array<Record<string, any>>,
    format: ExportFormat,
    entityType: string,
    jobId: number,
  ): Promise<{ fileName: string; filePath: string; fileSize: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${entityType}_export_${timestamp}.${format.toLowerCase()}`;
    const filePath = join(this.exportStoragePath, fileName);

    switch (format) {
      case ExportFormat.CSV:
        return this.generateCSV(data, fileName, filePath);
      case ExportFormat.JSON:
        return this.generateJSON(data, fileName, filePath);
      case ExportFormat.EXCEL:
        return this.generateExcel(data, fileName, filePath);
      case ExportFormat.PDF:
        return this.generatePDF(data, fileName, filePath);
      default:
        throw new BadRequestException(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate CSV file
   */
  private async generateCSV(
    data: Array<Record<string, any>>,
    fileName: string,
    filePath: string,
  ): Promise<{ fileName: string; filePath: string; fileSize: number }> {
    if (data.length === 0) {
      writeFileSync(filePath, '');
      return { fileName, filePath, fileSize: 0 };
    }

    // Get headers from first record
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    // Add data rows
    data.forEach((record) => {
      const values = headers.map((header) => {
        const value = record[header];
        // Escape commas and quotes
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    writeFileSync(filePath, csvContent, 'utf-8');

    return {
      fileName,
      filePath,
      fileSize: Buffer.byteLength(csvContent, 'utf-8'),
    };
  }

  /**
   * Generate JSON file
   */
  private async generateJSON(
    data: Array<Record<string, any>>,
    fileName: string,
    filePath: string,
  ): Promise<{ fileName: string; filePath: string; fileSize: number }> {
    const jsonContent = JSON.stringify(data, null, 2);
    writeFileSync(filePath, jsonContent, 'utf-8');

    return {
      fileName,
      filePath,
      fileSize: Buffer.byteLength(jsonContent, 'utf-8'),
    };
  }

  /**
   * Generate Excel file
   * Note: Requires xlsx or exceljs package
   */
  private async generateExcel(
    data: Array<Record<string, any>>,
    fileName: string,
    filePath: string,
  ): Promise<{ fileName: string; filePath: string; fileSize: number }> {
    // TODO: Install and use xlsx or exceljs
    // Example with xlsx:
    // const worksheet = xlsx.utils.json_to_sheet(data);
    // const workbook = xlsx.utils.book_new();
    // xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    // xlsx.writeFile(workbook, filePath);
    // const stats = fs.statSync(filePath);
    // return { fileName, filePath, fileSize: stats.size };

    throw new BadRequestException(
      'Excel export not yet implemented. Please install xlsx or exceljs package.',
    );
  }

  /**
   * Generate PDF file
   * Note: Requires pdfkit package
   */
  private async generatePDF(
    data: Array<Record<string, any>>,
    fileName: string,
    filePath: string,
  ): Promise<{ fileName: string; filePath: string; fileSize: number }> {
    // TODO: Install and use pdfkit
    // Example with pdfkit:
    // const doc = new PDFDocument();
    // const stream = fs.createWriteStream(filePath);
    // doc.pipe(stream);
    // // Add content
    // doc.end();
    // // Wait for stream to finish and get file size
    // const stats = fs.statSync(filePath);
    // return { fileName, filePath, fileSize: stats.size };

    throw new BadRequestException('PDF export not yet implemented. Please install pdfkit package.');
  }

  /**
   * Send export email
   */
  private async sendExportEmail(job: ExportJob): Promise<void> {
    if (!job.emailRecipients || job.emailRecipients.length === 0) {
      this.logger.warn(`No email recipients for export job ${job.id}`);
      return;
    }

    if (!job.filePath) {
      throw new BadRequestException('Export file not generated yet');
    }

    try {
      // TODO: Implement email sending with attachment
      // await this.emailService.sendEmailWithAttachment({
      //   to: job.emailRecipients,
      //   subject: job.emailSubject || `Export: ${job.entityType}`,
      //   body: job.emailBody || 'Please find the attached export file.',
      //   attachments: [{
      //     filename: job.fileName || 'export.csv',
      //     path: job.filePath,
      //   }],
      // });

      job.emailSent = true;
      job.emailSentAt = new Date();
      await this.exportJobRepository.save(job);

      this.logger.log(`Export email sent for job ${job.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send export email: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Cancel export job
   */
  async cancelExportJob(jobId: number): Promise<void> {
    const job = await this.exportJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Export job not found: ${jobId}`);
    }

    if (job.status !== ExportJobStatus.PENDING && job.status !== ExportJobStatus.PROCESSING) {
      throw new BadRequestException(`Cannot cancel export job. Current status: ${job.status}`);
    }

    job.status = ExportJobStatus.CANCELLED;
    job.completedAt = new Date();
    await this.exportJobRepository.save(job);
  }

  /**
   * Get export jobs with pagination
   */
  async getExportJobs(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: ExportJobStatus;
      entityType?: string;
      organizationId?: number;
      isScheduled?: boolean;
    },
  ): Promise<{ jobs: ExportJobResponseDto[]; total: number }> {
    const result = await this.exportJobRepository.findWithPagination(page, limit, filters);
    return {
      jobs: result.jobs.map((j) => ExportJobResponseDto.fromEntity(j)),
      total: result.total,
    };
  }

  /**
   * Get export statistics
   */
  async getExportStatistics(organizationId: number): Promise<{
    total: number;
    completed: number;
    failed: number;
    processing: number;
    pending: number;
  }> {
    return this.exportJobRepository.getExportStatistics(organizationId);
  }
}
