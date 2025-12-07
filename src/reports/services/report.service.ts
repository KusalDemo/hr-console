import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ReportDefinitionRepository } from '../repositories/report-definition.repository';
import { ReportScheduleRepository } from '../repositories/report-schedule.repository';
import {
  ReportDefinition,
  ReportStatus,
  ReportType,
  ReportOutputFormat,
} from '../entities/report-definition.entity';
import {
  ReportSchedule,
  ScheduleFrequency,
  ScheduleStatus,
} from '../entities/report-schedule.entity';
import { ReportQueryBuilderService } from './report-query-builder.service';

/**
 * Report Service
 * 
 * Manages reports with:
 * - Report CRUD operations
 * - Report templates and cloning
 * - Report generation
 * - Report scheduling
 * - Multiple output formats
 */
@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly reportDefinitionRepository: ReportDefinitionRepository,
    private readonly reportScheduleRepository: ReportScheduleRepository,
    private readonly reportQueryBuilderService: ReportQueryBuilderService,
  ) {}

  /**
   * Create a new report definition
   */
  async createReportDefinition(createDto: any, createdBy?: number): Promise<ReportDefinition> {
    if (!createDto.dataSourceConfig) {
      throw new BadRequestException('Data source configuration is required');
    }

    const report = this.reportDefinitionRepository.create({
      ...createDto,
      reportType: createDto.reportType || ReportType.TABLE,
      status: createDto.status || ReportStatus.DRAFT,
      defaultOutputFormat: createDto.defaultOutputFormat || ReportOutputFormat.PDF,
      isTemplate: createDto.isTemplate || false,
      isActive: true,
      createdBy,
    });

    const saved = await this.reportDefinitionRepository.save(report);

    this.logger.log(`Created report definition: ${saved.id} (${saved.reportName})`);

    return saved;
  }

  /**
   * Get report definition by ID
   */
  async getReportDefinitionById(
    id: number,
    includeSchedules = false,
  ): Promise<ReportDefinition> {
    const report = await this.reportDefinitionRepository.findById(id, includeSchedules);

    if (!report) {
      throw new NotFoundException(`Report definition with ID ${id} not found`);
    }

    return report;
  }

  /**
   * Update report definition
   */
  async updateReportDefinition(
    id: number,
    updateDto: any,
    updatedBy?: number,
  ): Promise<ReportDefinition> {
    const report = await this.reportDefinitionRepository.findById(id);

    if (!report) {
      throw new NotFoundException(`Report definition with ID ${id} not found`);
    }

    Object.assign(report, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.reportDefinitionRepository.save(report);

    this.logger.log(`Updated report definition: ${saved.id} (${saved.reportName})`);

    return saved;
  }

  /**
   * Delete report definition
   */
  async deleteReportDefinition(id: number): Promise<void> {
    const report = await this.reportDefinitionRepository.findById(id);

    if (!report) {
      throw new NotFoundException(`Report definition with ID ${id} not found`);
    }

    await this.reportDefinitionRepository.remove(report);

    this.logger.log(`Deleted report definition: ${id}`);
  }

  /**
   * Generate report
   */
  async generateReport(
    reportDefinitionId: number,
    outputFormat?: ReportOutputFormat,
    filters?: Record<string, any>,
  ): Promise<any> {
    const report = await this.reportDefinitionRepository.findById(reportDefinitionId);

    if (!report) {
      throw new NotFoundException(`Report definition with ID ${reportDefinitionId} not found`);
    }

    if (!report.isActive || report.status !== ReportStatus.ACTIVE) {
      throw new BadRequestException('Report is not active');
    }

    // Build query
    const queryBuilder = await this.reportQueryBuilderService.buildQuery(report);

    // Apply additional filters if provided
    if (filters) {
      // This would need more sophisticated filter application
      this.logger.warn('Additional filters not yet fully implemented');
    }

    // Execute query
    const data = await this.reportQueryBuilderService.executeQuery(queryBuilder);

    // Format output based on format
    const format = outputFormat || report.defaultOutputFormat;

    return {
      reportId: report.id,
      reportName: report.reportName,
      format,
      data,
      generatedAt: new Date(),
      recordCount: data.length,
    };
  }

  /**
   * Clone report from template or existing report
   */
  async cloneReport(
    sourceReportId: number,
    newReportName: string,
    organizationId: number,
    createdBy?: number,
  ): Promise<ReportDefinition> {
    const sourceReport = await this.reportDefinitionRepository.findById(sourceReportId);

    if (!sourceReport) {
      throw new NotFoundException(`Source report with ID ${sourceReportId} not found`);
    }

    const newReport = this.reportDefinitionRepository.create({
      reportName: newReportName,
      reportDescription: sourceReport.reportDescription,
      organizationId,
      reportType: sourceReport.reportType,
      status: ReportStatus.DRAFT,
      dataSourceConfig: JSON.parse(JSON.stringify(sourceReport.dataSourceConfig)),
      fieldSelections: sourceReport.fieldSelections
        ? JSON.parse(JSON.stringify(sourceReport.fieldSelections))
        : null,
      filterConfig: sourceReport.filterConfig
        ? JSON.parse(JSON.stringify(sourceReport.filterConfig))
        : null,
      groupingConfig: sourceReport.groupingConfig
        ? JSON.parse(JSON.stringify(sourceReport.groupingConfig))
        : null,
      sortingConfig: sourceReport.sortingConfig
        ? JSON.parse(JSON.stringify(sourceReport.sortingConfig))
        : null,
      defaultOutputFormat: sourceReport.defaultOutputFormat,
      reportTemplate: sourceReport.reportTemplate
        ? JSON.parse(JSON.stringify(sourceReport.reportTemplate))
        : null,
      isTemplate: false,
      templateId: sourceReport.isTemplate ? sourceReport.id : sourceReport.templateId,
      isActive: true,
      category: sourceReport.category,
      tags: sourceReport.tags ? [...sourceReport.tags] : null,
      permissionsConfig: sourceReport.permissionsConfig
        ? JSON.parse(JSON.stringify(sourceReport.permissionsConfig))
        : null,
      emailConfig: sourceReport.emailConfig
        ? JSON.parse(JSON.stringify(sourceReport.emailConfig))
        : null,
      createdBy,
    });

    const saved = await this.reportDefinitionRepository.save(newReport);

    this.logger.log(`Cloned report: ${sourceReportId} -> ${saved.id} (${saved.reportName})`);

    return saved;
  }

  /**
   * Create report schedule
   */
  async createSchedule(
    reportDefinitionId: number,
    scheduleData: any,
    createdBy?: number,
  ): Promise<ReportSchedule> {
    const report = await this.reportDefinitionRepository.findById(reportDefinitionId);

    if (!report) {
      throw new NotFoundException(`Report definition with ID ${reportDefinitionId} not found`);
    }

    // Calculate next run date
    const nextRunAt = this.calculateNextRunDate(
      scheduleData.frequency || ScheduleFrequency.DAILY,
      scheduleData.scheduleConfig,
      scheduleData.startDate,
    );

    const schedule = this.reportScheduleRepository.create({
      ...scheduleData,
      reportDefinitionId,
      frequency: scheduleData.frequency || ScheduleFrequency.DAILY,
      status: ScheduleStatus.ACTIVE,
      nextRunAt,
      executionCount: 0,
      createdBy,
    });

    const saved = await this.reportScheduleRepository.save(schedule);

    this.logger.log(`Created schedule: ${saved.id} for report ${reportDefinitionId}`);

    return saved;
  }

  /**
   * Calculate next run date
   */
  private calculateNextRunDate(
    frequency: ScheduleFrequency,
    scheduleConfig?: Record<string, any>,
    startDate?: Date,
  ): Date {
    const now = new Date();
    const baseDate = startDate || now;

    switch (frequency) {
      case ScheduleFrequency.ONCE:
        return baseDate;

      case ScheduleFrequency.DAILY:
        const nextDay = new Date(baseDate);
        nextDay.setDate(nextDay.getDate() + 1);
        if (scheduleConfig?.time) {
          const [hours, minutes] = scheduleConfig.time.split(':');
          nextDay.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        return nextDay;

      case ScheduleFrequency.WEEKLY:
        const nextWeek = new Date(baseDate);
        nextWeek.setDate(nextWeek.getDate() + 7);
        if (scheduleConfig?.dayOfWeek !== undefined) {
          const daysUntilTarget = (scheduleConfig.dayOfWeek - nextWeek.getDay() + 7) % 7;
          nextWeek.setDate(nextWeek.getDate() + daysUntilTarget);
        }
        if (scheduleConfig?.time) {
          const [hours, minutes] = scheduleConfig.time.split(':');
          nextWeek.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        return nextWeek;

      case ScheduleFrequency.MONTHLY:
        const nextMonth = new Date(baseDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        if (scheduleConfig?.dayOfMonth !== undefined) {
          nextMonth.setDate(scheduleConfig.dayOfMonth);
        }
        if (scheduleConfig?.time) {
          const [hours, minutes] = scheduleConfig.time.split(':');
          nextMonth.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        return nextMonth;

      default:
        return new Date(baseDate.getTime() + 24 * 60 * 60 * 1000); // Default: next day
    }
  }

  /**
   * Get schedules for report
   */
  async getReportSchedules(
    reportDefinitionId: number,
    includeInactive = false,
  ): Promise<ReportSchedule[]> {
    const report = await this.reportDefinitionRepository.findById(reportDefinitionId);

    if (!report) {
      throw new NotFoundException(`Report definition with ID ${reportDefinitionId} not found`);
    }

    return this.reportScheduleRepository.findByReportDefinition(
      reportDefinitionId,
      includeInactive,
    );
  }

  /**
   * Update schedule
   */
  async updateSchedule(
    scheduleId: number,
    updateDto: any,
    updatedBy?: number,
  ): Promise<ReportSchedule> {
    const schedule = await this.reportScheduleRepository.findById(scheduleId);

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${scheduleId} not found`);
    }

    // Recalculate next run if frequency or config changed
    if (updateDto.frequency || updateDto.scheduleConfig) {
      updateDto.nextRunAt = this.calculateNextRunDate(
        updateDto.frequency || schedule.frequency,
        updateDto.scheduleConfig || schedule.scheduleConfig,
        updateDto.startDate ? new Date(updateDto.startDate) : schedule.startDate || undefined,
      );
    }

    Object.assign(schedule, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.reportScheduleRepository.save(schedule);

    this.logger.log(`Updated schedule: ${saved.id}`);

    return saved;
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(scheduleId: number): Promise<void> {
    const schedule = await this.reportScheduleRepository.findById(scheduleId);

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${scheduleId} not found`);
    }

    await this.reportScheduleRepository.remove(schedule);

    this.logger.log(`Deleted schedule: ${scheduleId}`);
  }

  /**
   * Get reports by organization
   */
  async getReportsByOrganization(
    organizationId: number,
    includeInactive = false,
  ): Promise<ReportDefinition[]> {
    return this.reportDefinitionRepository.findByOrganization(
      organizationId,
      includeInactive,
    );
  }

  /**
   * Get report templates
   */
  async getTemplates(organizationId?: number): Promise<ReportDefinition[]> {
    return this.reportDefinitionRepository.findTemplates(organizationId);
  }

  /**
   * Search reports
   */
  async searchReports(
    searchTerm?: string,
    reportType?: ReportType,
    status?: ReportStatus,
    category?: string,
    organizationId?: number,
    includeInactive = false,
  ): Promise<ReportDefinition[]> {
    return this.reportDefinitionRepository.searchReports(
      searchTerm,
      reportType,
      status,
      category,
      organizationId,
      includeInactive,
    );
  }

  /**
   * Get schedules due for execution
   */
  async getSchedulesDueForExecution(beforeDate?: Date): Promise<ReportSchedule[]> {
    return this.reportScheduleRepository.findSchedulesDueForExecution(beforeDate);
  }
}
