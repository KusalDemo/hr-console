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
import { HolidayService } from './services/holiday.service';
import { CreateHolidayCalendarDto, CreateHolidayDto, AssignCalendarToEmployeeDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CalendarType } from './entities/holiday-calendar.entity';

/**
 * Holidays Controller
 *
 * REST API endpoints for holiday calendar management:
 * - Holiday calendars (CRUD, search)
 * - Holidays (CRUD, recurring generation)
 * - Calendar assignments to employees
 */
@Controller('holidays')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HolidaysController {
  constructor(private readonly holidayService: HolidayService) {}

  // ========== Calendar Endpoints ==========

  /**
   * Create a new holiday calendar
   * POST /holidays/calendars
   */
  @Post('calendars')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async createCalendar(
    @Body() createDto: CreateHolidayCalendarDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.holidayService.createCalendar(createDto, user.userId);
  }

  /**
   * Get calendar by ID
   * GET /holidays/calendars/:id
   */
  @Get('calendars/:id')
  async getCalendar(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeHolidays', new ParseBoolPipe({ optional: true })) includeHolidays = false,
  ) {
    return this.holidayService.getCalendarById(id, includeHolidays);
  }

  /**
   * Get calendar by key
   * GET /holidays/calendars/key/:calendarKey
   */
  @Get('calendars/key/:calendarKey')
  async getCalendarByKey(@Param('calendarKey') calendarKey: string) {
    return this.holidayService.getCalendarByKey(calendarKey);
  }

  /**
   * Update calendar
   * PUT /holidays/calendars/:id
   */
  @Put('calendars/:id')
  @Roles('ADMIN', 'HR')
  async updateCalendar(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: Partial<CreateHolidayCalendarDto>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.holidayService.updateCalendar(id, updateDto, user.userId);
  }

  /**
   * Get calendars by country
   * GET /holidays/calendars/country/:countryCode
   */
  @Get('calendars/country/:countryCode')
  async getCalendarsByCountry(@Param('countryCode') countryCode: string) {
    return this.holidayService.getCalendarsByCountry(countryCode);
  }

  /**
   * Get calendars by region
   * GET /holidays/calendars/region/:countryCode/:regionCode
   */
  @Get('calendars/region/:countryCode/:regionCode')
  async getCalendarsByRegion(
    @Param('countryCode') countryCode: string,
    @Param('regionCode') regionCode: string,
  ) {
    return this.holidayService.getCalendarsByRegion(countryCode, regionCode);
  }

  /**
   * Get default calendar
   * GET /holidays/calendars/default
   */
  @Get('calendars/default')
  async getDefaultCalendar(
    @Query('countryCode') countryCode: string,
    @Query('regionCode') regionCode?: string,
  ) {
    return this.holidayService.getDefaultCalendar(countryCode, regionCode);
  }

  /**
   * Get active calendars
   * GET /holidays/calendars
   */
  @Get('calendars')
  async getActiveCalendars(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.holidayService.getActiveCalendars(organizationId);
  }

  /**
   * Search calendars
   * GET /holidays/calendars/search
   */
  @Get('calendars/search')
  async searchCalendars(
    @Query('searchTerm') searchTerm?: string,
    @Query('countryCode') countryCode?: string,
    @Query('regionCode') regionCode?: string,
    @Query('calendarType') calendarType?: CalendarType,
    @Query('isCompanySpecific', new ParseBoolPipe({ optional: true })) isCompanySpecific?: boolean,
  ) {
    return this.holidayService.searchCalendars({
      searchTerm,
      countryCode,
      regionCode,
      calendarType,
      isCompanySpecific,
    });
  }

  // ========== Holiday Endpoints ==========

  /**
   * Create a new holiday
   * POST /holidays
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async createHoliday(@Body() createDto: CreateHolidayDto, @CurrentUser() user: JwtPayload) {
    return this.holidayService.createHoliday(createDto, user.userId);
  }

  /**
   * Get holiday by ID
   * GET /holidays/:id
   */
  @Get(':id')
  async getHoliday(@Param('id', ParseIntPipe) id: number) {
    return this.holidayService.getHolidayById(id);
  }

  /**
   * Get holidays by calendar
   * GET /holidays/calendars/:calendarId/holidays
   */
  @Get('calendars/:calendarId/holidays')
  async getHolidaysByCalendar(
    @Param('calendarId', ParseIntPipe) calendarId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.holidayService.getHolidaysByCalendar(
      calendarId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      includeInactive,
    );
  }

  /**
   * Get holidays for employee
   * GET /holidays/employee/:employeeId
   */
  @Get('employee/:employeeId')
  async getHolidaysForEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.holidayService.getHolidaysForEmployee(
      employeeId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Check if date is a holiday for employee
   * GET /holidays/employee/:employeeId/check/:date
   */
  @Get('employee/:employeeId/check/:date')
  async isHolidayForEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Param('date') date: string,
  ) {
    return this.holidayService.isHolidayForEmployee(employeeId, new Date(date));
  }

  /**
   * Generate recurring holidays for a year
   * POST /holidays/calendars/:calendarId/generate/:year
   */
  @Post('calendars/:calendarId/generate/:year')
  @Roles('ADMIN', 'HR')
  async generateRecurringHolidays(
    @Param('calendarId', ParseIntPipe) calendarId: number,
    @Param('year', ParseIntPipe) year: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.holidayService.generateRecurringHolidays(calendarId, year, user.userId);
  }

  // ========== Assignment Endpoints ==========

  /**
   * Assign calendar to employee
   * POST /holidays/assign
   */
  @Post('assign')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async assignCalendarToEmployee(
    @Body() assignDto: AssignCalendarToEmployeeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.holidayService.assignCalendarToEmployee(
      assignDto.employeeId,
      assignDto.calendarId,
      {
        effectiveStartDate: new Date(assignDto.effectiveStartDate),
        effectiveEndDate: assignDto.effectiveEndDate
          ? new Date(assignDto.effectiveEndDate)
          : undefined,
        assignmentNotes: assignDto.assignmentNotes,
      },
      user.userId,
    );
  }

  /**
   * Get employee's calendar assignment
   * GET /holidays/employee/:employeeId/calendar
   */
  @Get('employee/:employeeId/calendar')
  async getEmployeeCalendarAssignment(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.holidayService.getEmployeeCalendarAssignment(employeeId);
  }

  /**
   * Remove calendar assignment
   * DELETE /holidays/assignments/:id
   */
  @Delete('assignments/:id')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAssignment(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    await this.holidayService.removeAssignment(id, user.userId);
  }
}
