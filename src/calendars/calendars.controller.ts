import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
} from '@nestjs/common';
import { CalendarService } from './services/calendar.service';
import { CreateCalendarDto, CreateCalendarEventDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * Calendars Controller
 *
 * REST API endpoints for calendar and event management:
 * - Calendars (CRUD, visibility management)
 * - Calendar events (CRUD, recurrence, attendees)
 * - Conflict detection
 * - Event scheduling
 */
@Controller('calendars')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalendarsController {
  constructor(private readonly calendarService: CalendarService) {}

  // ========== Calendar Endpoints ==========

  /**
   * Create a new calendar
   * POST /calendars
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async createCalendar(@Body() createDto: CreateCalendarDto, @CurrentUser() user: JwtPayload) {
    return this.calendarService.createCalendar(createDto, user.userId);
  }

  /**
   * Get calendar by ID
   * GET /calendars/:id
   */
  @Get(':id')
  async getCalendar(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeEvents', new ParseBoolPipe({ optional: true })) includeEvents = false,
  ) {
    return this.calendarService.getCalendarById(id, includeEvents);
  }

  /**
   * Update calendar
   * PUT /calendars/:id
   */
  @Put(':id')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async updateCalendar(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.calendarService.updateCalendar(id, updateDto, user.userId);
  }

  // ========== Event Endpoints ==========

  /**
   * Create a new calendar event
   * POST /calendars/:calendarId/events
   */
  @Post(':calendarId/events')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async createEvent(
    @Param('calendarId', ParseIntPipe) calendarId: number,
    @Body() createDto: CreateCalendarEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.calendarService.createEvent({ ...createDto, calendarId }, user.userId);
  }

  /**
   * Get event by ID
   * GET /calendars/events/:id
   */
  @Get('events/:id')
  async getEvent(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeAttendees', new ParseBoolPipe({ optional: true })) includeAttendees = false,
  ) {
    return this.calendarService.getEventById(id, includeAttendees);
  }

  /**
   * Update event
   * PUT /calendars/events/:id
   */
  @Put('events/:id')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async updateEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.calendarService.updateEvent(id, updateDto, user.userId);
  }

  /**
   * Cancel event
   * DELETE /calendars/events/:id
   */
  @Delete('events/:id')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async cancelEvent(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.calendarService.cancelEvent(id, user.userId);
  }

  /**
   * Get events by date range
   * GET /calendars/events
   */
  @Get('events')
  async getEvents(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
    @Query('calendarIds') calendarIds?: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const calendarIdsArray = calendarIds
      ? calendarIds.split(',').map((id) => parseInt(id, 10))
      : undefined;

    return this.calendarService.getEventsByDateRange(start, end, userId, calendarIdsArray);
  }

  /**
   * Get upcoming events
   * GET /calendars/events/upcoming
   */
  @Get('events/upcoming')
  async getUpcomingEvents(
    @Query('userId', ParseIntPipe) userId: number,
    @Query('daysAhead', new ParseIntPipe({ optional: true })) daysAhead = 7,
    @Query('calendarIds') calendarIds?: string,
  ) {
    const calendarIdsArray = calendarIds
      ? calendarIds.split(',').map((id) => parseInt(id, 10))
      : undefined;

    return this.calendarService.getUpcomingEvents(userId, daysAhead, calendarIdsArray);
  }

  /**
   * Check event conflicts
   * GET /calendars/events/:id/conflicts
   */
  @Get('events/:id/conflicts')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async checkEventConflicts(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId', ParseIntPipe) userId: number,
  ) {
    return this.calendarService.checkEventConflicts(id, userId);
  }
}
