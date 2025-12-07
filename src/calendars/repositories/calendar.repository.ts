import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Calendar, CalendarType, CalendarVisibility } from '../entities/calendar.entity';

/**
 * Calendar Repository
 * 
 * Custom repository methods for calendar queries.
 */
@Injectable()
export class CalendarRepository extends Repository<Calendar> {
  constructor(private dataSource: DataSource) {
    super(Calendar, dataSource.createEntityManager());
  }

  /**
   * Find calendar by ID
   */
  async findById(id: number, includeEvents = false): Promise<Calendar | null> {
    const query = this.createQueryBuilder('calendar').where('calendar.id = :id', { id });

    if (includeEvents) {
      query.leftJoinAndSelect('calendar.events', 'events');
    }

    return query.getOne();
  }

  /**
   * Find calendars by owner
   */
  async findByOwner(
    ownerId: number,
    organizationId?: number,
    includeInactive = false,
  ): Promise<Calendar[]> {
    const query = this.createQueryBuilder('calendar')
      .where('calendar.ownerId = :ownerId', { ownerId })
      .orderBy('calendar.isDefault', 'DESC')
      .addOrderBy('calendar.calendarName', 'ASC');

    if (organizationId) {
      query.andWhere('calendar.organizationId = :organizationId', { organizationId });
    }

    if (!includeInactive) {
      query.andWhere('calendar.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  /**
   * Find calendars by type
   */
  async findByType(
    type: CalendarType,
    organizationId?: number,
    includeInactive = false,
  ): Promise<Calendar[]> {
    const query = this.createQueryBuilder('calendar')
      .where('calendar.calendarType = :type', { type })
      .orderBy('calendar.calendarName', 'ASC');

    if (organizationId) {
      query.andWhere('calendar.organizationId = :organizationId', { organizationId });
    }

    if (!includeInactive) {
      query.andWhere('calendar.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  /**
   * Find default calendar for owner
   */
  async findDefaultCalendar(ownerId: number, organizationId?: number): Promise<Calendar | null> {
    const query = this.createQueryBuilder('calendar')
      .where('calendar.ownerId = :ownerId', { ownerId })
      .andWhere('calendar.isDefault = :isDefault', { isDefault: true })
      .andWhere('calendar.isActive = :isActive', { isActive: true });

    if (organizationId) {
      query.andWhere('calendar.organizationId = :organizationId', { organizationId });
    }

    return query.getOne();
  }

  /**
   * Find visible calendars for user
   */
  async findVisibleCalendars(
    userId: number,
    organizationId?: number,
  ): Promise<Calendar[]> {
    const query = this.createQueryBuilder('calendar')
      .where(
        `(
          calendar.calendarVisibility = :public OR
          calendar.calendarVisibility = :internal OR
          calendar.ownerId = :userId
        )`,
        { public: CalendarVisibility.PUBLIC, internal: CalendarVisibility.INTERNAL, userId },
      )
      .andWhere('calendar.isActive = :isActive', { isActive: true })
      .orderBy('calendar.calendarName', 'ASC');

    if (organizationId) {
      query.andWhere('calendar.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }
}

