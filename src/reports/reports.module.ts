import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportService, ReportQueryBuilderService } from './services';
import { ReportDefinitionRepository, ReportScheduleRepository } from './repositories';
import { ReportDefinition, ReportSchedule } from './entities';
import { Organization } from '../organizations/entities/organization.entity';

/**
 * Reports Module
 *
 * Provides custom report generation with scheduling:
 * - Report definition CRUD operations
 * - Report templates and cloning
 * - Dynamic query building
 * - Report generation (multiple output formats)
 * - Scheduled report generation
 * - Email delivery
 * - Report sharing and permissions
 */
@Module({
  imports: [TypeOrmModule.forFeature([ReportDefinition, ReportSchedule, Organization])],
  controllers: [ReportsController],
  providers: [
    ReportService,
    ReportQueryBuilderService,
    ReportDefinitionRepository,
    ReportScheduleRepository,
  ],
  exports: [
    ReportService,
    ReportQueryBuilderService,
    ReportDefinitionRepository,
    ReportScheduleRepository,
  ],
})
export class ReportsModule {}
