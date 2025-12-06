import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TimesheetEntry } from '../entities/timesheet-entry.entity';

/**
 * Timesheet Entry Repository
 */
@Injectable()
export class TimesheetEntryRepository extends Repository<TimesheetEntry> {
  constructor(private dataSource: DataSource) {
    super(TimesheetEntry, dataSource.createEntityManager());
  }

  /**
   * Find entries by timesheet
   */
  async findByTimesheet(timesheetId: number): Promise<TimesheetEntry[]> {
    return this.find({
      where: {
        timesheetId,
      },
      order: {
        entryDate: 'ASC',
      },
    });
  }

  /**
   * Find entries by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<TimesheetEntry[]> {
    return this.createQueryBuilder('entry')
      .where('entry.entryDate >= :startDate', { startDate })
      .andWhere('entry.entryDate <= :endDate', { endDate })
      .orderBy('entry.entryDate', 'ASC')
      .getMany();
  }
}

