import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService, ExportService } from './services';
import {
  CreateImportTemplateDto,
  UpdateImportTemplateDto,
  CreateImportJobDto,
  ImportTemplateResponseDto,
  ImportJobResponseDto,
  CreateExportTemplateDto,
  UpdateExportTemplateDto,
  CreateExportJobDto,
  ExportTemplateResponseDto,
  ExportJobResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ImportJobStatus } from './entities/import-job.entity';
import { ExportJobStatus } from './entities/export-job.entity';
import { Res, BadRequestException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream } from 'fs';

/**
 * Import Export Controller
 *
 * REST API endpoints for import/export operations:
 * - Import template management (CRUD)
 * - Import job management
 * - File upload and processing
 */
@Controller('import-export')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportExportController {
  constructor(
    private readonly importService: ImportService,
    private readonly exportService: ExportService,
  ) {}

  /**
   * Create import template
   * POST /import-export/templates
   */
  @Post('templates')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @Body() createDto: CreateImportTemplateDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ImportTemplateResponseDto> {
    return this.importService.createTemplate(createDto, user.userId);
  }

  /**
   * Get import template by ID
   * GET /import-export/templates/:id
   */
  @Get('templates/:id')
  async getTemplate(@Param('id', ParseIntPipe) id: number): Promise<ImportTemplateResponseDto> {
    return this.importService.getTemplateById(id);
  }

  /**
   * Get templates by entity type
   * GET /import-export/templates?entityType=Employee
   */
  @Get('templates')
  async getTemplates(
    @Query('entityType') entityType?: string,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ): Promise<ImportTemplateResponseDto[]> {
    if (entityType) {
      return this.importService.getTemplatesByEntityType(entityType, organizationId);
    }
    return [];
  }

  /**
   * Update import template
   * PUT /import-export/templates/:id
   */
  @Put('templates/:id')
  @Roles('ADMIN', 'HR')
  async updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateImportTemplateDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ImportTemplateResponseDto> {
    return this.importService.updateTemplate(id, updateDto, user.userId);
  }

  /**
   * Delete import template
   * DELETE /import-export/templates/:id
   */
  @Delete('templates/:id')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.importService.deleteTemplate(id);
  }

  /**
   * Create import job and upload file
   * POST /import-export/jobs
   */
  @Post('jobs')
  @Roles('ADMIN', 'HR')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async createImportJob(
    @Body() createDto: CreateImportJobDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ): Promise<ImportJobResponseDto> {
    if (!file) {
      throw new Error('File is required');
    }

    // TODO: Save file to storage (S3, local filesystem, etc.)
    // For now, we'll use a placeholder file path
    const filePath = `/tmp/uploads/${file.originalname}`;

    // Create import job with file information
    const jobDto: CreateImportJobDto = {
      ...createDto,
      fileName: file.originalname,
      fileSize: file.size,
      filePath: filePath,
    };

    const job = await this.importService.createImportJob(jobDto, user.userId);

    // TODO: Process import job asynchronously (e.g., via background job queue)
    // For now, we'll process it synchronously (not recommended for production)
    // await this.importService.processImportJob(job.id);

    return job;
  }

  /**
   * Get import job by ID
   * GET /import-export/jobs/:id
   */
  @Get('jobs/:id')
  async getImportJob(@Param('id', ParseIntPipe) id: number): Promise<ImportJobResponseDto> {
    return this.importService.getImportJobById(id);
  }

  /**
   * Get import jobs with pagination
   * GET /import-export/jobs?page=1&limit=20&status=COMPLETED
   */
  @Get('jobs')
  async getImportJobs(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: ImportJobStatus,
    @Query('entityType') entityType?: string,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ): Promise<{ jobs: ImportJobResponseDto[]; total: number }> {
    return this.importService.getImportJobs(page || 1, limit || 20, {
      status,
      entityType,
      organizationId,
    });
  }

  /**
   * Process import job
   * POST /import-export/jobs/:id/process
   */
  @Post('jobs/:id/process')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.ACCEPTED)
  async processImportJob(@Param('id', ParseIntPipe) id: number): Promise<{
    message: string;
    jobId: number;
  }> {
    // Process asynchronously (in production, this should be queued)
    this.importService.processImportJob(id).catch((error) => {
      console.error(`Failed to process import job ${id}:`, error);
    });

    return {
      message: 'Import job queued for processing',
      jobId: id,
    };
  }

  /**
   * Cancel import job
   * POST /import-export/jobs/:id/cancel
   */
  @Post('jobs/:id/cancel')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.OK)
  async cancelImportJob(@Param('id', ParseIntPipe) id: number): Promise<{
    message: string;
    jobId: number;
  }> {
    await this.importService.cancelImportJob(id);
    return {
      message: 'Import job cancelled',
      jobId: id,
    };
  }

  /**
   * Get import statistics
   * GET /import-export/statistics?organizationId=1
   */
  @Get('statistics')
  async getImportStatistics(
    @Query('organizationId', ParseIntPipe) organizationId: number,
  ): Promise<{
    total: number;
    completed: number;
    failed: number;
    processing: number;
    pending: number;
  }> {
    return this.importService.getImportStatistics(organizationId);
  }

  // ==================== Export Endpoints ====================

  /**
   * Create export template
   * POST /import-export/export-templates
   */
  @Post('export-templates')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.CREATED)
  async createExportTemplate(
    @Body() createDto: CreateExportTemplateDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExportTemplateResponseDto> {
    return this.exportService.createTemplate(createDto, user.userId);
  }

  /**
   * Get export template by ID
   * GET /import-export/export-templates/:id
   */
  @Get('export-templates/:id')
  async getExportTemplate(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ExportTemplateResponseDto> {
    return this.exportService.getTemplateById(id);
  }

  /**
   * Get export templates by entity type
   * GET /import-export/export-templates?entityType=Employee
   */
  @Get('export-templates')
  async getExportTemplates(
    @Query('entityType') entityType?: string,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ): Promise<ExportTemplateResponseDto[]> {
    if (entityType) {
      return this.exportService.getTemplatesByEntityType(entityType, organizationId);
    }
    return [];
  }

  /**
   * Update export template
   * PUT /import-export/export-templates/:id
   */
  @Put('export-templates/:id')
  @Roles('ADMIN', 'HR')
  async updateExportTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateExportTemplateDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExportTemplateResponseDto> {
    return this.exportService.updateTemplate(id, updateDto, user.userId);
  }

  /**
   * Delete export template
   * DELETE /import-export/export-templates/:id
   */
  @Delete('export-templates/:id')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteExportTemplate(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.exportService.deleteTemplate(id);
  }

  /**
   * Create export job
   * POST /import-export/export-jobs
   */
  @Post('export-jobs')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.CREATED)
  async createExportJob(
    @Body() createDto: CreateExportJobDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExportJobResponseDto> {
    const job = await this.exportService.createExportJob(createDto, user.userId);

    // Process export job asynchronously (in production, this should be queued)
    if (!job.isScheduled) {
      this.exportService.processExportJob(job.id).catch((error) => {
        console.error(`Failed to process export job ${job.id}:`, error);
      });
    }

    return job;
  }

  /**
   * Get export job by ID
   * GET /import-export/export-jobs/:id
   */
  @Get('export-jobs/:id')
  async getExportJob(@Param('id', ParseIntPipe) id: number): Promise<ExportJobResponseDto> {
    return this.exportService.getExportJobById(id);
  }

  /**
   * Get export jobs with pagination
   * GET /import-export/export-jobs?page=1&limit=20&status=COMPLETED
   */
  @Get('export-jobs')
  async getExportJobs(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: ExportJobStatus,
    @Query('entityType') entityType?: string,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('isScheduled', new ParseIntPipe({ optional: true })) isScheduled?: boolean,
  ): Promise<{ jobs: ExportJobResponseDto[]; total: number }> {
    return this.exportService.getExportJobs(page || 1, limit || 20, {
      status,
      entityType,
      organizationId,
      isScheduled,
    });
  }

  /**
   * Process export job
   * POST /import-export/export-jobs/:id/process
   */
  @Post('export-jobs/:id/process')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.ACCEPTED)
  async processExportJob(@Param('id', ParseIntPipe) id: number): Promise<{
    message: string;
    jobId: number;
  }> {
    // Process asynchronously (in production, this should be queued)
    this.exportService.processExportJob(id).catch((error) => {
      console.error(`Failed to process export job ${id}:`, error);
    });

    return {
      message: 'Export job queued for processing',
      jobId: id,
    };
  }

  /**
   * Cancel export job
   * POST /import-export/export-jobs/:id/cancel
   */
  @Post('export-jobs/:id/cancel')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.OK)
  async cancelExportJob(@Param('id', ParseIntPipe) id: number): Promise<{
    message: string;
    jobId: number;
  }> {
    await this.exportService.cancelExportJob(id);
    return {
      message: 'Export job cancelled',
      jobId: id,
    };
  }

  /**
   * Download export file
   * GET /import-export/export-jobs/:id/download
   */
  @Get('export-jobs/:id/download')
  async downloadExportFile(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const job = await this.exportService.getExportJobById(id);

    if (job.status !== 'COMPLETED') {
      throw new BadRequestException('Export job is not completed yet');
    }

    if (!job.filePath) {
      throw new NotFoundException('Export file not found');
    }

    const fileStream = createReadStream(job.filePath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${job.fileName || 'export.csv'}"`);
    fileStream.pipe(res);
  }

  /**
   * Get export statistics
   * GET /import-export/export-statistics?organizationId=1
   */
  @Get('export-statistics')
  async getExportStatistics(
    @Query('organizationId', ParseIntPipe) organizationId: number,
  ): Promise<{
    total: number;
    completed: number;
    failed: number;
    processing: number;
    pending: number;
  }> {
    return this.exportService.getExportStatistics(organizationId);
  }
}
