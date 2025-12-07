import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CalendarRepository, CalendarEventRepository } from '../repositories';
import { CalendarConflictService } from './calendar-conflict.service';
import {
  Calendar,
  CalendarType,
  CalendarVisibility,
  CalendarEvent,
  EventStatus,
  EventType,
  CalendarEventAttendee,
  AttendeeStatus,
  AttendeeRole,
  RecurrenceRule,
  RecurrenceFrequency,
} from '../entities';

/**
 * Calendar Service
 *
 * Manages calendars and events with:
 * - Calendar CRUD operations
 * - Event management
 * - Conflict detection
 * - Recurrence handling
 * - Attendee management
 */
@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly calendarRepository: CalendarRepository,
    private readonly calendarEventRepository: CalendarEventRepository,
    private readonly calendarConflictService: CalendarConflictService,
  ) {}

  // ========== Calendar Methods ==========

  /**
   * Create a new calendar
   */
  async createCalendar(createDto: any, createdBy?: number): Promise<Calendar> {
    // Check if default calendar already exists for owner
    if (createDto.isDefault) {
      const existingDefault = await this.calendarRepository.findDefaultCalendar(
        createDto.ownerId,
        createDto.organizationId,
      );

      if (existingDefault) {
        // Unset existing default
        existingDefault.isDefault = false;
        await this.calendarRepository.save(existingDefault);
      }
    }

    const calendar = this.calendarRepository.create({
      ...createDto,
      calendarType: createDto.calendarType || CalendarType.USER,
      calendarVisibility: createDto.calendarVisibility || CalendarVisibility.PRIVATE,
      defaultTimezone: createDto.defaultTimezone || 'UTC',
      isActive: true,
      createdBy,
    });

    const saved = await this.calendarRepository.save(calendar);
    const savedEntity = Array.isArray(saved) ? saved[0] : saved;

    this.logger.log(`Created calendar: ${savedEntity.id} (${savedEntity.calendarName})`);

    return savedEntity;
  }

  /**
   * Get calendar by ID
   */
  async getCalendarById(id: number, includeEvents = false): Promise<Calendar> {
    const calendar = await this.calendarRepository.findById(id, includeEvents);

    if (!calendar) {
      throw new NotFoundException(`Calendar with ID ${id} not found`);
    }

    return calendar;
  }

  /**
   * Update calendar
   */
  async updateCalendar(id: number, updateDto: any, updatedBy?: number): Promise<Calendar> {
    const calendar = await this.calendarRepository.findById(id);

    if (!calendar) {
      throw new NotFoundException(`Calendar with ID ${id} not found`);
    }

    // Handle default calendar change
    if (updateDto.isDefault && !calendar.isDefault) {
      const existingDefault = await this.calendarRepository.findDefaultCalendar(
        calendar.ownerId,
        calendar.organizationId || undefined,
      );

      if (existingDefault && existingDefault.id !== id) {
        existingDefault.isDefault = false;
        await this.calendarRepository.save(existingDefault);
      }
    }

    Object.assign(calendar, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.calendarRepository.save(calendar);

    this.logger.log(`Updated calendar: ${id}`);

    return saved;
  }

  // ========== Event Methods ==========

  /**
   * Create a new calendar event
   */
  async createEvent(createDto: any, createdBy?: number): Promise<CalendarEvent> {
    const calendar = await this.calendarRepository.findById(createDto.calendarId);

    if (!calendar) {
      throw new NotFoundException(`Calendar with ID ${createDto.calendarId} not found`);
    }

    // Validate time range
    if (createDto.endTime <= createDto.startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check for conflicts if organizer is specified
    if (createDto.organizerId) {
      const conflictCheck = await this.calendarConflictService.checkConflicts(
        new Date(createDto.startTime),
        new Date(createDto.endTime),
        createDto.organizerId,
        undefined,
        [createDto.calendarId],
      );

      if (conflictCheck.hasConflict) {
        this.logger.warn(
          `Event conflicts detected for organizer ${createDto.organizerId}: ${conflictCheck.conflicts.length} conflicts`,
        );
        // Don't throw error, just log warning - allow creation but flag for review
      }
    }

    const event = this.calendarEventRepository.create({
      ...createDto,
      startTime: new Date(createDto.startTime),
      endTime: new Date(createDto.endTime),
      eventType: createDto.eventType || EventType.OTHER,
      eventStatus: createDto.eventStatus || EventStatus.CONFIRMED,
      isRecurring: createDto.isRecurring || false,
      isAllDay: createDto.isAllDay || false,
      timezone: createDto.timezone || calendar.defaultTimezone,
      createdBy,
    });

    const saved = await this.calendarEventRepository.save(event);

    // Create attendees if provided
    if (createDto.attendees && Array.isArray(createDto.attendees)) {
      // Attendees will be saved via cascade
    }

    const savedEntity = Array.isArray(saved) ? saved[0] : saved;
    this.logger.log(`Created calendar event: ${savedEntity.id} (${savedEntity.eventTitle})`);

    return savedEntity;
  }

  /**
   * Get event by ID
   */
  async getEventById(id: number, includeAttendees = false): Promise<CalendarEvent> {
    const event = await this.calendarEventRepository.findById(id, includeAttendees);

    if (!event) {
      throw new NotFoundException(`Calendar event with ID ${id} not found`);
    }

    return event;
  }

  /**
   * Update event
   */
  async updateEvent(id: number, updateDto: any, updatedBy?: number): Promise<CalendarEvent> {
    const event = await this.calendarEventRepository.findById(id);

    if (!event) {
      throw new NotFoundException(`Calendar event with ID ${id} not found`);
    }

    if (event.eventStatus === EventStatus.CANCELLED) {
      throw new BadRequestException('Cannot update cancelled event');
    }

    // Validate time range if updating times
    if (updateDto.startTime || updateDto.endTime) {
      const startTime = updateDto.startTime ? new Date(updateDto.startTime) : event.startTime;
      const endTime = updateDto.endTime ? new Date(updateDto.endTime) : event.endTime;

      if (endTime <= startTime) {
        throw new BadRequestException('End time must be after start time');
      }

      // Check for conflicts
      if (event.organizerId) {
        const conflictCheck = await this.calendarConflictService.checkConflicts(
          startTime,
          endTime,
          event.organizerId,
          id,
          [event.calendarId],
        );

        if (conflictCheck.hasConflict) {
          this.logger.warn(
            `Event update conflicts detected: ${conflictCheck.conflicts.length} conflicts`,
          );
        }
      }
    }

    Object.assign(event, {
      ...updateDto,
      startTime: updateDto.startTime ? new Date(updateDto.startTime) : event.startTime,
      endTime: updateDto.endTime ? new Date(updateDto.endTime) : event.endTime,
      updatedBy,
    });

    const saved = await this.calendarEventRepository.save(event);

    this.logger.log(`Updated calendar event: ${id}`);

    return saved;
  }

  /**
   * Get events by date range
   */
  async getEventsByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: number,
    calendarIds?: number[],
  ): Promise<CalendarEvent[]> {
    return this.calendarEventRepository.findByDateRange(startDate, endDate, calendarIds, userId);
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(
    userId: number,
    daysAhead = 7,
    calendarIds?: number[],
  ): Promise<CalendarEvent[]> {
    return this.calendarEventRepository.findUpcoming(userId, daysAhead, calendarIds);
  }

  /**
   * Cancel event
   */
  async cancelEvent(id: number, updatedBy?: number): Promise<CalendarEvent> {
    const event = await this.calendarEventRepository.findById(id);

    if (!event) {
      throw new NotFoundException(`Calendar event with ID ${id} not found`);
    }

    event.eventStatus = EventStatus.CANCELLED;
    event.updatedBy = updatedBy ?? null;

    const saved = await this.calendarEventRepository.save(event);

    this.logger.log(`Cancelled calendar event: ${id}`);

    return saved;
  }

  /**
   * Check event conflicts
   */
  async checkEventConflicts(
    eventId: number,
    userId: number,
  ): Promise<{
    hasConflict: boolean;
    conflicts: CalendarEvent[];
    conflictSummary: string;
  }> {
    const event = await this.calendarEventRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException(`Calendar event with ID ${eventId} not found`);
    }

    return this.calendarConflictService.getConflictDetails(event, userId);
  }
}
