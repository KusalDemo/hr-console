import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between } from 'typeorm';
import { CalendarEvent, EventStatus, EventType } from '../entities/calendar-event.entity';

/**
 * Calendar Event Repository
 *
 * Custom repository methods for calendar event queries.
 */
@Injectable()
export class CalendarEventRepository extends Repository<CalendarEvent> {
  constructor(private dataSource: DataSource) {
    super(CalendarEvent, dataSource.createEntityManager());
  }

  /**
   * Find event by ID
   */
  async findById(id: number, includeAttendees = false): Promise<CalendarEvent | null> {
    const query = this.createQueryBuilder('event')
      .leftJoinAndSelect('event.calendar', 'calendar')
      .where('event.id = :id', { id });

    if (includeAttendees) {
      query.leftJoinAndSelect('event.attendees', 'attendees');
    }

    return query.getOne();
  }

  /**
   * Find events by calendar
   */
  async findByCalendar(
    calendarId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CalendarEvent[]> {
    const query = this.createQueryBuilder('event')
      .leftJoinAndSelect('event.calendar', 'calendar')
      .where('event.calendarId = :calendarId', { calendarId })
      .andWhere('event.eventStatus != :cancelled', { cancelled: EventStatus.CANCELLED })
      .orderBy('event.startTime', 'ASC');

    if (startDate && endDate) {
      query.andWhere('(event.startTime <= :endDate AND event.endTime >= :startDate)', {
        startDate,
        endDate,
      });
    }

    return query.getMany();
  }

  /**
   * Find events by date range
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    calendarIds?: number[],
    userId?: number,
  ): Promise<CalendarEvent[]> {
    const query = this.createQueryBuilder('event')
      .leftJoinAndSelect('event.calendar', 'calendar')
      .leftJoinAndSelect('event.attendees', 'attendees')
      .where('event.startTime <= :endDate', { endDate })
      .andWhere('event.endTime >= :startDate', { startDate })
      .andWhere('event.eventStatus != :cancelled', { cancelled: EventStatus.CANCELLED })
      .orderBy('event.startTime', 'ASC');

    if (calendarIds && calendarIds.length > 0) {
      query.andWhere('event.calendarId IN (:...calendarIds)', { calendarIds });
    }

    if (userId) {
      query.andWhere('(event.organizerId = :userId OR attendees.userId = :userId)', { userId });
    }

    return query.getMany();
  }

  /**
   * Find events by organizer
   */
  async findByOrganizer(
    organizerId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CalendarEvent[]> {
    const query = this.createQueryBuilder('event')
      .leftJoinAndSelect('event.calendar', 'calendar')
      .where('event.organizerId = :organizerId', { organizerId })
      .andWhere('event.eventStatus != :cancelled', { cancelled: EventStatus.CANCELLED })
      .orderBy('event.startTime', 'ASC');

    if (startDate && endDate) {
      query.andWhere('(event.startTime <= :endDate AND event.endTime >= :startDate)', {
        startDate,
        endDate,
      });
    }

    return query.getMany();
  }

  /**
   * Find events by attendee
   */
  async findByAttendee(userId: number, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    const query = this.createQueryBuilder('event')
      .leftJoinAndSelect('event.calendar', 'calendar')
      .leftJoinAndSelect('event.attendees', 'attendees')
      .where('attendees.userId = :userId', { userId })
      .andWhere('event.eventStatus != :cancelled', { cancelled: EventStatus.CANCELLED })
      .orderBy('event.startTime', 'ASC');

    if (startDate && endDate) {
      query.andWhere('(event.startTime <= :endDate AND event.endTime >= :startDate)', {
        startDate,
        endDate,
      });
    }

    return query.getMany();
  }

  /**
   * Find conflicting events
   */
  async findConflictingEvents(
    startTime: Date,
    endTime: Date,
    excludeEventId?: number,
    userId?: number,
    calendarIds?: number[],
  ): Promise<CalendarEvent[]> {
    const query = this.createQueryBuilder('event')
      .leftJoinAndSelect('event.calendar', 'calendar')
      .leftJoinAndSelect('event.attendees', 'attendees')
      .where(
        `(
          (event.startTime < :endTime AND event.endTime > :startTime)
        )`,
        { startTime, endTime },
      )
      .andWhere('event.eventStatus != :cancelled', { cancelled: EventStatus.CANCELLED });

    if (excludeEventId) {
      query.andWhere('event.id != :excludeEventId', { excludeEventId });
    }

    if (userId) {
      query.andWhere('(event.organizerId = :userId OR attendees.userId = :userId)', { userId });
    }

    if (calendarIds && calendarIds.length > 0) {
      query.andWhere('event.calendarId IN (:...calendarIds)', { calendarIds });
    }

    return query.getMany();
  }

  /**
   * Find upcoming events
   */
  async findUpcoming(
    userId: number,
    daysAhead: number,
    calendarIds?: number[],
  ): Promise<CalendarEvent[]> {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const query = this.createQueryBuilder('event')
      .leftJoinAndSelect('event.calendar', 'calendar')
      .leftJoinAndSelect('event.attendees', 'attendees')
      .where('event.startTime >= :now', { now })
      .andWhere('event.startTime <= :endDate', { endDate })
      .andWhere('event.eventStatus != :cancelled', { cancelled: EventStatus.CANCELLED })
      .andWhere('(event.organizerId = :userId OR attendees.userId = :userId)', { userId })
      .orderBy('event.startTime', 'ASC');

    if (calendarIds && calendarIds.length > 0) {
      query.andWhere('event.calendarId IN (:...calendarIds)', { calendarIds });
    }

    return query.getMany();
  }
}
