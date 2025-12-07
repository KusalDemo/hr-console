import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between } from 'typeorm';
import { Holiday } from '../entities/holiday.entity';

/**
 * Holiday Repository
 *
 * Custom repository methods for holiday queries.
 */
@Injectable()
export class HolidayRepository extends Repository<Holiday> {
  constructor(private dataSource: DataSource) {
    super(Holiday, dataSource.createEntityManager());
  }

  /**
   * Find holiday by ID
   */
  async findById(id: number): Promise<Holiday | null> {
    return this.createQueryBuilder('holiday')
      .leftJoinAndSelect('holiday.holidayCalendar', 'holidayCalendar')
      .where('holiday.id = :id', { id })
      .getOne();
  }

  /**
   * Find holidays by calendar
   */
  async findByCalendar(
    calendarId: number,
    startDate?: Date,
    endDate?: Date,
    includeInactive = false,
  ): Promise<Holiday[]> {
    const query = this.createQueryBuilder('holiday')
      .where('holiday.holidayCalendarId = :calendarId', { calendarId })
      .orderBy('holiday.holidayDate', 'ASC');

    if (!includeInactive) {
      query.andWhere('holiday.isActive = :isActive', { isActive: true });
    }

    if (startDate && endDate) {
      query.andWhere(
        '(holiday.holidayDate BETWEEN :startDate AND :endDate OR holiday.observedDate BETWEEN :startDate AND :endDate)',
        { startDate, endDate },
      );
    } else if (startDate) {
      query.andWhere('(holiday.holidayDate >= :startDate OR holiday.observedDate >= :startDate)', {
        startDate,
      });
    } else if (endDate) {
      query.andWhere('(holiday.holidayDate <= :endDate OR holiday.observedDate <= :endDate)', {
        endDate,
      });
    }

    return query.getMany();
  }

  /**
   * Find holidays by calendar and date
   */
  async findByCalendarAndDate(calendarId: number, date: Date): Promise<Holiday[]> {
    const dateStr = date.toISOString().split('T')[0];
    return this.createQueryBuilder('holiday')
      .where('holiday.holidayCalendarId = :calendarId', { calendarId })
      .andWhere('(holiday.holidayDate = :date OR holiday.observedDate = :date)', { date: dateStr })
      .andWhere('holiday.isActive = :isActive', { isActive: true })
      .getMany();
  }

  /**
   * Find recurring holidays
   */
  async findRecurring(calendarId: number): Promise<Holiday[]> {
    return this.createQueryBuilder('holiday')
      .where('holiday.holidayCalendarId = :calendarId', { calendarId })
      .andWhere('holiday.isRecurring = :isRecurring', { isRecurring: true })
      .andWhere('holiday.isActive = :isActive', { isActive: true })
      .getMany();
  }

  /**
   * Find floating holidays
   */
  async findFloating(calendarId: number): Promise<Holiday[]> {
    return this.createQueryBuilder('holiday')
      .where('holiday.holidayCalendarId = :calendarId', { calendarId })
      .andWhere('holiday.isFloating = :isFloating', { isFloating: true })
      .andWhere('holiday.isActive = :isActive', { isActive: true })
      .getMany();
  }

  /**
   * Find holidays by type
   */
  async findByType(calendarId: number, holidayType: string): Promise<Holiday[]> {
    return this.createQueryBuilder('holiday')
      .where('holiday.holidayCalendarId = :calendarId', { calendarId })
      .andWhere('holiday.holidayType = :holidayType', { holidayType })
      .andWhere('holiday.isActive = :isActive', { isActive: true })
      .orderBy('holiday.holidayDate', 'ASC')
      .getMany();
  }
}
