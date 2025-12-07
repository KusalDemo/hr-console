import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ReportDefinition, ReportStatus, ReportType } from '../entities/report-definition.entity';

/**
 * Report Definition Repository
 *
 * Custom repository methods for report definition queries.
 */
@Injectable()
export class ReportDefinitionRepository extends Repository<ReportDefinition> {
  constructor(private dataSource: DataSource) {
    super(ReportDefinition, dataSource.createEntityManager());
  }

  /**
   * Find report definition by ID
   */
  async findById(id: number, includeSchedules = false): Promise<ReportDefinition | null> {
    const query = this.createQueryBuilder('report').where('report.id = :id', { id });

    if (includeSchedules) {
      query.leftJoinAndSelect('report.schedules', 'schedules');
    }

    return query.getOne();
  }

  /**
   * Find reports by organization
   */
  async findByOrganization(
    organizationId: number,
    includeInactive = false,
  ): Promise<ReportDefinition[]> {
    const query = this.createQueryBuilder('report')
      .where('report.organizationId = :organizationId', { organizationId })
      .orderBy('report.reportName', 'ASC');

    if (!includeInactive) {
      query.andWhere('report.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  /**
   * Find reports by status
   */
  async findByStatus(status: ReportStatus, organizationId?: number): Promise<ReportDefinition[]> {
    const query = this.createQueryBuilder('report')
      .where('report.status = :status', { status })
      .andWhere('report.isActive = :isActive', { isActive: true })
      .orderBy('report.reportName', 'ASC');

    if (organizationId) {
      query.andWhere('report.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find reports by type
   */
  async findByType(reportType: ReportType, organizationId?: number): Promise<ReportDefinition[]> {
    const query = this.createQueryBuilder('report')
      .where('report.reportType = :reportType', { reportType })
      .andWhere('report.isActive = :isActive', { isActive: true })
      .orderBy('report.reportName', 'ASC');

    if (organizationId) {
      query.andWhere('report.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find report templates
   */
  async findTemplates(organizationId?: number): Promise<ReportDefinition[]> {
    const query = this.createQueryBuilder('report')
      .where('report.isTemplate = :isTemplate', { isTemplate: true })
      .andWhere('report.isActive = :isActive', { isActive: true })
      .orderBy('report.reportName', 'ASC');

    if (organizationId) {
      query.andWhere('report.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find reports by category
   */
  async findByCategory(category: string, organizationId?: number): Promise<ReportDefinition[]> {
    const query = this.createQueryBuilder('report')
      .where('report.category = :category', { category })
      .andWhere('report.isActive = :isActive', { isActive: true })
      .orderBy('report.reportName', 'ASC');

    if (organizationId) {
      query.andWhere('report.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
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
    const query = this.createQueryBuilder('report').orderBy('report.reportName', 'ASC');

    if (searchTerm) {
      query.andWhere(
        `(
          report.reportName ILIKE :searchTerm OR
          report.reportDescription ILIKE :searchTerm
        )`,
        { searchTerm: `%${searchTerm}%` },
      );
    }

    if (reportType) {
      query.andWhere('report.reportType = :reportType', { reportType });
    }

    if (status) {
      query.andWhere('report.status = :status', { status });
    }

    if (category) {
      query.andWhere('report.category = :category', { category });
    }

    if (organizationId) {
      query.andWhere('report.organizationId = :organizationId', { organizationId });
    }

    if (!includeInactive) {
      query.andWhere('report.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }
}
