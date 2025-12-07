import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarsController } from './calendars.controller';
import { CalendarService, CalendarConflictService } from './services';
import { CalendarRepository, CalendarEventRepository } from './repositories';
import { Calendar, CalendarEvent, CalendarEventAttendee, RecurrenceRule } from './entities';

/**
 * Calendars Module
 *
 * Provides multi-calendar event management:
 * - Calendar CRUD operations
 * - Event management with attendees, recurrence, reminders
 * - Conflict detection
 * - Timezone support
 * - Room/resource booking integration
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Calendar, CalendarEvent, CalendarEventAttendee, RecurrenceRule]),
  ],
  controllers: [CalendarsController],
  providers: [
    CalendarService,
    CalendarConflictService,
    CalendarRepository,
    CalendarEventRepository,
  ],
  exports: [CalendarService, CalendarConflictService, CalendarRepository, CalendarEventRepository],
})
export class CalendarsModule {}
