import { Injectable, Logger } from '@nestjs/common';
import { CalendarEventRepository } from '../repositories/calendar-event.repository';
import { CalendarEvent } from '../entities/calendar-event.entity';

/**
 * Calendar Conflict Service
 * 
 * Conflict detection algorithms for calendar events.
 */
@Injectable()
export class CalendarConflictService {
  private readonly logger = new Logger(CalendarConflictService.name);

  constructor(
    private readonly calendarEventRepository: CalendarEventRepository,
  ) {}

  /**
   * Check for conflicts with a new event
   */
  async checkConflicts(
    startTime: Date,
    endTime: Date,
    userId: number,
    excludeEventId?: number,
    calendarIds?: number[],
  ): Promise<{
    hasConflict: boolean;
    conflicts: CalendarEvent[];
  }> {
    const conflicts = await this.calendarEventRepository.findConflictingEvents(
      startTime,
      endTime,
      excludeEventId,
      userId,
      calendarIds,
    );

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Check if two time ranges overlap
   */
  private timeRangesOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date,
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Get conflict details
   */
  async getConflictDetails(
    event: CalendarEvent,
    userId: number,
  ): Promise<{
    hasConflict: boolean;
    conflicts: CalendarEvent[];
    conflictSummary: string;
  }> {
    const conflictResult = await this.checkConflicts(
      event.startTime,
      event.endTime,
      userId,
      event.id,
    );

    let conflictSummary = '';
    if (conflictResult.hasConflict) {
      const conflictCount = conflictResult.conflicts.length;
      conflictSummary = `Found ${conflictCount} conflicting event${conflictCount > 1 ? 's' : ''}`;
    } else {
      conflictSummary = 'No conflicts found';
    }

    return {
      ...conflictResult,
      conflictSummary,
    };
  }
}

