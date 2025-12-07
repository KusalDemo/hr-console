import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportExportController } from './import-export.controller';
import {
  ImportService,
  ImportProcessorService,
  ExportService,
  ReportBuilderService,
} from './services';
import {
  ImportJobRepository,
  ImportTemplateRepository,
  ExportJobRepository,
  ExportTemplateRepository,
} from './repositories';
import { ImportJob, ImportTemplate, ExportJob, ExportTemplate } from './entities';
import { OrganizationsModule } from '../organizations/organizations.module';
import { EmailModule } from '../email/email.module';

/**
 * Import Export Module
 *
 * Provides comprehensive import capabilities:
 * - Import template management
 * - Import job tracking
 * - File parsing (CSV, Excel, JSON)
 * - Data transformation and validation
 * - Batch processing
 * - Error handling and rollback
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ImportJob, ImportTemplate, ExportJob, ExportTemplate]),
    OrganizationsModule,
    EmailModule,
  ],
  controllers: [ImportExportController],
  providers: [
    ImportService,
    ImportProcessorService,
    ExportService,
    ReportBuilderService,
    ImportJobRepository,
    ImportTemplateRepository,
    ExportJobRepository,
    ExportTemplateRepository,
  ],
  exports: [
    ImportService,
    ImportProcessorService,
    ExportService,
    ReportBuilderService,
    ImportJobRepository,
    ImportTemplateRepository,
    ExportJobRepository,
    ExportTemplateRepository,
  ],
})
export class ImportExportModule {}
