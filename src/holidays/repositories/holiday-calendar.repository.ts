import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HolidayCalendar, CalendarType } from '../entities/holiday-calendar.entity';

/**
 * Holiday Calendar Repository
 * 
 * Custom repository methods for holiday calendar queries.
 */
@Injectable()
export class HolidayCalendarRepository extends Repository<HolidayCalendar> {
  constructor(private dataSource: DataSource) {
    super(HolidayCalendar, dataSource.createEntityManager());
  }

  /**
   * Find calendar by ID
   */
  async findById(id: number, includeHolidays = false): Promise<HolidayCalendar | null> {
    const query = this.createQueryBuilder('calendar').where('calendar.id = :id', { id });

    if (includeHolidays) {
      query.leftJoinAndSelect('calendar.holidays', 'holidays');
    }

    return query.getOne();
  }

  /**
   * Find calendar by key
   */
  async findByCalendarKey(calendarKey: string): Promise<HolidayCalendar | null> {
    return this.findOne({ where: { calendarKey } });
  }

  /**
   * Find calendars by country
   */
  async findByCountry(countryCode: string): Promise<HolidayCalendar[]> {
    return this.createQueryBuilder('calendar')
      .where('calendar.countryCode = :countryCode', { countryCode })
      .andWhere('calendar.isActive = :isActive', { isActive: true })
      .andWhere('calendar.isArchived = :isArchived', { isArchived: false })
      .orderBy('calendar.isDefault', 'DESC')
      .addOrderBy('calendar.name', 'ASC')
      .getMany();
  }

  /**
   * Find calendars by region
   */
  async findByRegion(countryCode: string, regionCode: string): Promise<HolidayCalendar[]> {
    return this.createQueryBuilder('calendar')
      .where('calendar.countryCode = :countryCode', { countryCode })
      .andWhere('calendar.regionCode = :regionCode', { regionCode })
      .andWhere('calendar.isActive = :isActive', { isActive: true })
      .andWhere('calendar.isArchived = :isArchived', { isArchived: false })
      .orderBy('calendar.isDefault', 'DESC')
      .addOrderBy('calendar.name', 'ASC')
      .getMany();
  }

  /**
   * Find default calendar for country/region
   */
  async findDefault(countryCode: string, regionCode?: string): Promise<HolidayCalendar | null> {
    const query = this.createQueryBuilder('calendar')
      .where('calendar.countryCode = :countryCode', { countryCode })
      .andWhere('calendar.isDefault = :isDefault', { isDefault: true })
      .andWhere('calendar.isActive = :isActive', { isActive: true })
      .andWhere('calendar.isArchived = :isArchived', { isArchived: false });

    if (regionCode) {
      query.andWhere('calendar.regionCode = :regionCode', { regionCode });
    } else {
      query.andWhere('calendar.regionCode IS NULL');
    }

    return query.getOne();
  }

  /**
   * Find active calendars
   */
  async findActive(organizationId?: number): Promise<HolidayCalendar[]> {
    const query = this.createQueryBuilder('calendar')
      .where('calendar.isActive = :isActive', { isActive: true })
      .andWhere('calendar.isArchived = :isArchived', { isArchived: false })
      .orderBy('calendar.name', 'ASC');

    if (organizationId) {
      query.andWhere('calendar.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Search calendars
   */
  async searchCalendars(
    searchTerm?: string,
    countryCode?: string,
    regionCode?: string,
    calendarType?: CalendarType,
    isCompanySpecific?: boolean,
  ): Promise<HolidayCalendar[]> {
    const query = this.createQueryBuilder('calendar').orderBy('calendar.name', 'ASC');

    if (searchTerm) {
      query.andWhere(
        `(
          calendar.name ILIKE :searchTerm OR
          calendar.description ILIKE :searchTerm OR
          calendar.calendarKey ILIKE :searchTerm
        )`,
        { searchTerm: `%${searchTerm}%` },
      );
    }

    if (countryCode) {
      query.andWhere('calendar.countryCode = :countryCode', { countryCode });
    }

    if (regionCode) {
      query.andWhere('calendar.regionCode = :regionCode', { regionCode });
    }

    if (calendarType) {
      query.andWhere('calendar.calendarType = :calendarType', { calendarType });
    }

    if (isCompanySpecific !== undefined) {
      query.andWhere('calendar.isCompanySpecific = :isCompanySpecific', { isCompanySpecific });
    }

    query.andWhere('calendar.isArchived = :isArchived', { isArchived: false });

    return query.getMany();
  }
}
