import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  ReportSchedule,
  ScheduleStatus,
  ScheduleFrequency,
} from '../entities/report-schedule.entity';

/**
 * Report Schedule Repository
 *
 * Custom repository methods for report schedule queries.
 */
@Injectable()
export class ReportScheduleRepository extends Repository<ReportSchedule> {
  constructor(private dataSource: DataSource) {
    super(ReportSchedule, dataSource.createEntityManager());
  }

  /**
   * Find schedule by ID
   */
  async findById(id: number): Promise<ReportSchedule | null> {
    return this.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.reportDefinition', 'report')
      .where('schedule.id = :id', { id })
      .getOne();
  }

  /**
   * Find schedules by report definition
   */
  async findByReportDefinition(
    reportDefinitionId: number,
    includeInactive = false,
  ): Promise<ReportSchedule[]> {
    const query = this.createQueryBuilder('schedule')
      .where('schedule.reportDefinitionId = :reportDefinitionId', { reportDefinitionId })
      .orderBy('schedule.nextRunAt', 'ASC');

    if (!includeInactive) {
      query.andWhere('schedule.status = :status', { status: ScheduleStatus.ACTIVE });
    }

    return query.getMany();
  }

  /**
   * Find active schedules
   */
  async findActiveSchedules(reportDefinitionId?: number): Promise<ReportSchedule[]> {
    const query = this.createQueryBuilder('schedule')
      .where('schedule.status = :status', { status: ScheduleStatus.ACTIVE })
      .andWhere('schedule.nextRunAt IS NOT NULL')
      .orderBy('schedule.nextRunAt', 'ASC');

    if (reportDefinitionId) {
      query.andWhere('schedule.reportDefinitionId = :reportDefinitionId', { reportDefinitionId });
    }

    return query.getMany();
  }

  /**
   * Find schedules due for execution
   */
  async findSchedulesDueForExecution(beforeDate?: Date): Promise<ReportSchedule[]> {
    const executionDate = beforeDate || new Date();
    return this.createQueryBuilder('schedule')
      .where('schedule.status = :status', { status: ScheduleStatus.ACTIVE })
      .andWhere('schedule.nextRunAt <= :executionDate', { executionDate })
      .andWhere('(schedule.endDate IS NULL OR schedule.endDate >= :executionDate)', {
        executionDate,
      })
      .orderBy('schedule.nextRunAt', 'ASC')
      .getMany();
  }

  /**
   * Find schedules by frequency
   */
  async findByFrequency(
    frequency: ScheduleFrequency,
    reportDefinitionId?: number,
  ): Promise<ReportSchedule[]> {
    const query = this.createQueryBuilder('schedule')
      .where('schedule.frequency = :frequency', { frequency })
      .andWhere('schedule.status = :status', { status: ScheduleStatus.ACTIVE })
      .orderBy('schedule.nextRunAt', 'ASC');

    if (reportDefinitionId) {
      query.andWhere('schedule.reportDefinitionId = :reportDefinitionId', { reportDefinitionId });
    }

    return query.getMany();
  }

  /**
   * Find schedules by status
   */
  async findByStatus(
    status: ScheduleStatus,
    reportDefinitionId?: number,
  ): Promise<ReportSchedule[]> {
    const query = this.createQueryBuilder('schedule')
      .where('schedule.status = :status', { status })
      .orderBy('schedule.nextRunAt', 'ASC');

    if (reportDefinitionId) {
      query.andWhere('schedule.reportDefinitionId = :reportDefinitionId', { reportDefinitionId });
    }

    return query.getMany();
  }
}
