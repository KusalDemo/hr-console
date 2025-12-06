import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Timesheet, TimesheetStatus } from '../entities/timesheet.entity';

/**
 * Timesheet Repository
 */
@Injectable()
export class TimesheetRepository extends Repository<Timesheet> {
  constructor(private dataSource: DataSource) {
    super(Timesheet, dataSource.createEntityManager());
  }

  /**
   * Find timesheet by employee and period
   */
  async findByEmployeeAndPeriod(
    employeeId: number,
    periodId: number,
    periodStartDate: Date,
    includeRelations = false,
  ): Promise<Timesheet | null> {
    const query = this.createQueryBuilder('timesheet')
      .where('timesheet.employeeId = :employeeId', { employeeId })
      .andWhere('timesheet.periodId = :periodId', { periodId })
      .andWhere('timesheet.periodStartDate = :periodStartDate', { periodStartDate });

    if (includeRelations) {
      query
        .leftJoinAndSelect('timesheet.employee', 'employee')
        .leftJoinAndSelect('timesheet.period', 'period')
        .leftJoinAndSelect('timesheet.entries', 'entries');
    }

    return query.getOne();
  }

  /**
   * Find timesheets by employee
   */
  async findByEmployee(employeeId: number, includeRelations = false): Promise<Timesheet[]> {
    const query = this.createQueryBuilder('timesheet')
      .where('timesheet.employeeId = :employeeId', { employeeId })
      .orderBy('timesheet.periodStartDate', 'DESC');

    if (includeRelations) {
      query
        .leftJoinAndSelect('timesheet.employee', 'employee')
        .leftJoinAndSelect('timesheet.period', 'period');
    }

    return query.getMany();
  }

  /**
   * Find timesheets by employee and status
   */
  async findByEmployeeAndStatus(
    employeeId: number,
    status: TimesheetStatus,
    includeRelations = false,
  ): Promise<Timesheet[]> {
    const query = this.createQueryBuilder('timesheet')
      .where('timesheet.employeeId = :employeeId', { employeeId })
      .andWhere('timesheet.status = :status', { status })
      .orderBy('timesheet.periodStartDate', 'DESC');

    if (includeRelations) {
      query
        .leftJoinAndSelect('timesheet.employee', 'employee')
        .leftJoinAndSelect('timesheet.period', 'period');
    }

    return query.getMany();
  }

  /**
   * Find timesheets by period
   */
  async findByPeriod(
    periodId: number,
    periodStartDate: Date,
    includeRelations = false,
  ): Promise<Timesheet[]> {
    const query = this.createQueryBuilder('timesheet')
      .where('timesheet.periodId = :periodId', { periodId })
      .andWhere('timesheet.periodStartDate = :periodStartDate', { periodStartDate })
      .orderBy('timesheet.employeeId', 'ASC');

    if (includeRelations) {
      query
        .leftJoinAndSelect('timesheet.employee', 'employee')
        .leftJoinAndSelect('timesheet.period', 'period');
    }

    return query.getMany();
  }

  /**
   * Find timesheets by status
   */
  async findByStatus(status: TimesheetStatus, includeRelations = false): Promise<Timesheet[]> {
    const query = this.createQueryBuilder('timesheet')
      .where('timesheet.status = :status', { status })
      .orderBy('timesheet.periodStartDate', 'DESC');

    if (includeRelations) {
      query
        .leftJoinAndSelect('timesheet.employee', 'employee')
        .leftJoinAndSelect('timesheet.period', 'period');
    }

    return query.getMany();
  }

  /**
   * Find timesheet by ID
   */
  async findById(id: number, includeRelations = false): Promise<Timesheet | null> {
    const query = this.createQueryBuilder('timesheet').where('timesheet.id = :id', { id });

    if (includeRelations) {
      query
        .leftJoinAndSelect('timesheet.employee', 'employee')
        .leftJoinAndSelect('timesheet.period', 'period')
        .leftJoinAndSelect('timesheet.entries', 'entries');
    }

    return query.getOne();
  }
}

