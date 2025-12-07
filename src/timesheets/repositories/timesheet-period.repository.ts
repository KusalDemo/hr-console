import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TimesheetPeriod } from '../entities/timesheet-period.entity';

/**
 * Timesheet Period Repository
 */
@Injectable()
export class TimesheetPeriodRepository extends Repository<TimesheetPeriod> {
  constructor(private dataSource: DataSource) {
    super(TimesheetPeriod, dataSource.createEntityManager());
  }

  /**
   * Find period by key
   */
  async findByKey(periodKey: string): Promise<TimesheetPeriod | null> {
    return this.findOne({
      where: {
        periodKey,
        isActive: true,
      },
    });
  }

  /**
   * Find default period
   */
  async findDefault(): Promise<TimesheetPeriod | null> {
    return this.findOne({
      where: {
        isActive: true,
      },
      order: {
        periodKey: 'ASC',
      },
    });
  }

  /**
   * Find all active periods
   */
  async findAllActive(): Promise<TimesheetPeriod[]> {
    return this.find({
      where: {
        isActive: true,
      },
      order: {
        periodKey: 'ASC',
      },
    });
  }

  /**
   * Check if period key exists
   */
  async periodKeyExists(periodKey: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('period').where('period.periodKey = :periodKey', {
      periodKey,
    });

    if (excludeId) {
      query.andWhere('period.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}

