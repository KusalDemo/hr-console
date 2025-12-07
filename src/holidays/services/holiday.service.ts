import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { HolidayCalendarRepository } from '../repositories/holiday-calendar.repository';
import { HolidayRepository } from '../repositories/holiday.repository';
import { EmployeeHolidayCalendarAssignmentRepository } from '../repositories/employee-holiday-calendar-assignment.repository';
import { HolidayCalendar, CalendarType } from '../entities/holiday-calendar.entity';
import { Holiday, HolidayType } from '../entities/holiday.entity';
import { EmployeeHolidayCalendarAssignment } from '../entities/employee-holiday-calendar-assignment.entity';
import { Employee } from '../../employees/entities/employee.entity';

/**
 * Holiday Service
 *
 * Manages holiday calendars and holidays with:
 * - Calendar CRUD operations
 * - Holiday management (fixed, recurring, floating)
 * - Calendar assignment to employees/organizations
 * - Holiday observance calculation
 * - Integration with leave policies
 */
@Injectable()
export class HolidayService {
  private readonly logger = new Logger(HolidayService.name);

  constructor(
    private readonly calendarRepository: HolidayCalendarRepository,
    private readonly holidayRepository: HolidayRepository,
    private readonly assignmentRepository: EmployeeHolidayCalendarAssignmentRepository,
  ) {}

  // ========== Calendar Methods ==========

  /**
   * Create a new holiday calendar
   */
  async createCalendar(createDto: any, createdBy?: number): Promise<HolidayCalendar> {
    // Check if calendar key already exists
    const existing = await this.calendarRepository.findByCalendarKey(createDto.calendarKey);
    if (existing) {
      throw new ConflictException(`Calendar with key ${createDto.calendarKey} already exists`);
    }

    const calendar = this.calendarRepository.create({
      ...createDto,
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
      isArchived: false,
      createdBy,
    });

    const saved = await this.calendarRepository.save(calendar);
    const savedEntity = Array.isArray(saved) ? saved[0] : saved;

    this.logger.log(`Created holiday calendar: ${savedEntity.id} (${savedEntity.name})`);

    return savedEntity;
  }

  /**
   * Get calendar by ID
   */
  async getCalendarById(id: number, includeHolidays = false): Promise<HolidayCalendar> {
    const calendar = await this.calendarRepository.findById(id, includeHolidays);

    if (!calendar) {
      throw new NotFoundException(`Holiday calendar with ID ${id} not found`);
    }

    return calendar;
  }

  /**
   * Get calendar by key
   */
  async getCalendarByKey(calendarKey: string): Promise<HolidayCalendar> {
    const calendar = await this.calendarRepository.findByCalendarKey(calendarKey);

    if (!calendar) {
      throw new NotFoundException(`Holiday calendar with key ${calendarKey} not found`);
    }

    return calendar;
  }

  /**
   * Update calendar
   */
  async updateCalendar(id: number, updateDto: any, updatedBy?: number): Promise<HolidayCalendar> {
    const calendar = await this.calendarRepository.findById(id);

    if (!calendar) {
      throw new NotFoundException(`Holiday calendar with ID ${id} not found`);
    }

    // Check calendar key uniqueness if changed
    if (updateDto.calendarKey && updateDto.calendarKey !== calendar.calendarKey) {
      const existing = await this.calendarRepository.findByCalendarKey(updateDto.calendarKey);
      if (existing) {
        throw new ConflictException(`Calendar with key ${updateDto.calendarKey} already exists`);
      }
    }

    Object.assign(calendar, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.calendarRepository.save(calendar);

    this.logger.log(`Updated holiday calendar: ${id}`);

    return saved;
  }

  /**
   * Get calendars by country
   */
  async getCalendarsByCountry(countryCode: string): Promise<HolidayCalendar[]> {
    return this.calendarRepository.findByCountry(countryCode);
  }

  /**
   * Get calendars by region
   */
  async getCalendarsByRegion(countryCode: string, regionCode: string): Promise<HolidayCalendar[]> {
    return this.calendarRepository.findByRegion(countryCode, regionCode);
  }

  /**
   * Get default calendar for country/region
   */
  async getDefaultCalendar(
    countryCode: string,
    regionCode?: string,
  ): Promise<HolidayCalendar | null> {
    return this.calendarRepository.findDefault(countryCode, regionCode);
  }

  /**
   * Get active calendars
   */
  async getActiveCalendars(organizationId?: number): Promise<HolidayCalendar[]> {
    return this.calendarRepository.findActive(organizationId);
  }

  /**
   * Search calendars
   */
  async searchCalendars(filters: {
    searchTerm?: string;
    countryCode?: string;
    regionCode?: string;
    calendarType?: CalendarType;
    isCompanySpecific?: boolean;
  }): Promise<HolidayCalendar[]> {
    return this.calendarRepository.searchCalendars(
      filters.searchTerm,
      filters.countryCode,
      filters.regionCode,
      filters.calendarType,
      filters.isCompanySpecific,
    );
  }

  // ========== Holiday Methods ==========

  /**
   * Create a new holiday
   */
  async createHoliday(createDto: any, createdBy?: number): Promise<Holiday> {
    // Verify calendar exists
    const calendar = await this.calendarRepository.findById(createDto.holidayCalendarId);
    if (!calendar) {
      throw new NotFoundException(
        `Holiday calendar with ID ${createDto.holidayCalendarId} not found`,
      );
    }

    // Calculate observed date if needed
    const observedDate = this.calculateObservedDate(
      new Date(createDto.holidayDate),
      createDto.observanceRule,
      calendar.observanceRules,
    );

    const holiday = this.holidayRepository.create({
      ...createDto,
      holidayDate: new Date(createDto.holidayDate),
      observedDate: observedDate || new Date(createDto.holidayDate),
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
      createdBy,
    });

    const saved = await this.holidayRepository.save(holiday);

    const savedEntity = Array.isArray(saved) ? saved[0] : saved;
    this.logger.log(`Created holiday: ${savedEntity.id} (${savedEntity.name})`);

    return savedEntity;
  }

  /**
   * Get holiday by ID
   */
  async getHolidayById(id: number): Promise<Holiday> {
    const holiday = await this.holidayRepository.findById(id);

    if (!holiday) {
      throw new NotFoundException(`Holiday with ID ${id} not found`);
    }

    return holiday;
  }

  /**
   * Get holidays by calendar
   */
  async getHolidaysByCalendar(
    calendarId: number,
    startDate?: Date,
    endDate?: Date,
    includeInactive = false,
  ): Promise<Holiday[]> {
    return this.holidayRepository.findByCalendar(calendarId, startDate, endDate, includeInactive);
  }

  /**
   * Get holidays for employee (based on assigned calendar)
   */
  async getHolidaysForEmployee(
    employeeId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Holiday[]> {
    // Get employee's active calendar assignment
    const assignment = await this.assignmentRepository.findActiveByEmployee(employeeId);

    if (assignment.length === 0) {
      return [];
    }

    // Use the first active assignment (could be enhanced to support multiple calendars)
    const calendarId = assignment[0].holidayCalendarId;

    return this.holidayRepository.findByCalendar(calendarId, startDate, endDate, false);
  }

  /**
   * Check if date is a holiday for employee
   */
  async isHolidayForEmployee(employeeId: number, date: Date): Promise<boolean> {
    const holidays = await this.getHolidaysForEmployee(employeeId, date, date);
    return holidays.length > 0;
  }

  /**
   * Generate recurring holidays for a year
   */
  async generateRecurringHolidays(
    calendarId: number,
    year: number,
    createdBy?: number,
  ): Promise<Holiday[]> {
    const calendar = await this.calendarRepository.findById(calendarId);
    if (!calendar) {
      throw new NotFoundException(`Holiday calendar with ID ${calendarId} not found`);
    }

    // Get all recurring holidays for this calendar
    const recurringHolidays = await this.holidayRepository.findRecurring(calendarId);

    const generatedHolidays: Holiday[] = [];

    for (const template of recurringHolidays) {
      const holidayDate = this.calculateRecurringHolidayDate(template, year);

      if (holidayDate) {
        // Check if holiday already exists for this date
        const existing = await this.holidayRepository.findByCalendarAndDate(
          calendarId,
          holidayDate,
        );

        if (existing.length === 0) {
          const observedDate = this.calculateObservedDate(
            holidayDate,
            template.observanceRule,
            calendar.observanceRules,
          );

          const holiday = this.holidayRepository.create({
            holidayCalendarId: calendarId,
            name: template.name,
            description: template.description,
            holidayDate,
            observedDate: observedDate || holidayDate,
            holidayType: template.holidayType,
            isRecurring: true,
            recurrencePattern: template.recurrencePattern,
            recurrenceMonth: template.recurrenceMonth,
            recurrenceDay: template.recurrenceDay,
            recurrenceWeekday: template.recurrenceWeekday,
            recurrenceWeek: template.recurrenceWeek,
            isFloating: template.isFloating,
            floatingAllocationDays: template.floatingAllocationDays,
            observanceRule: template.observanceRule,
            isObserved: true,
            isActive: true,
            createdBy,
          });

          const saved = await this.holidayRepository.save(holiday);
          generatedHolidays.push(saved);
        }
      }
    }

    this.logger.log(
      `Generated ${generatedHolidays.length} recurring holidays for calendar ${calendarId}, year ${year}`,
    );

    return generatedHolidays;
  }

  // ========== Assignment Methods ==========

  /**
   * Assign calendar to employee
   */
  async assignCalendarToEmployee(
    employeeId: number,
    calendarId: number,
    assignmentData: {
      effectiveStartDate: Date;
      effectiveEndDate?: Date;
      assignmentNotes?: string;
    },
    createdBy?: number,
  ): Promise<EmployeeHolidayCalendarAssignment> {
    // Verify calendar exists
    const calendar = await this.calendarRepository.findById(calendarId);
    if (!calendar) {
      throw new NotFoundException(`Holiday calendar with ID ${calendarId} not found`);
    }

    // Check for existing active assignment
    const existingAssignments = await this.assignmentRepository.findActiveByEmployee(employeeId);
    const conflictingAssignment = existingAssignments.find(
      (a) =>
        a.holidayCalendarId === calendarId &&
        this.datesOverlap(
          assignmentData.effectiveStartDate,
          assignmentData.effectiveEndDate || null,
          new Date(a.effectiveStartDate),
          a.effectiveEndDate ? new Date(a.effectiveEndDate) : null,
        ),
    );

    if (conflictingAssignment) {
      throw new ConflictException(
        `Employee already has an active assignment for this calendar with overlapping dates`,
      );
    }

    const assignment = this.assignmentRepository.create({
      employeeId,
      holidayCalendarId: calendarId,
      effectiveStartDate: assignmentData.effectiveStartDate,
      effectiveEndDate: assignmentData.effectiveEndDate || null,
      isActive: true,
      assignmentNotes: assignmentData.assignmentNotes,
      createdBy,
    });

    const saved = await this.assignmentRepository.save(assignment);

    this.logger.log(`Assigned calendar ${calendarId} to employee ${employeeId}`);

    return saved;
  }

  /**
   * Get employee's active calendar assignment
   */
  async getEmployeeCalendarAssignment(employeeId: number): Promise<HolidayCalendar | null> {
    const assignments = await this.assignmentRepository.findActiveByEmployee(employeeId);

    if (assignments.length === 0) {
      return null;
    }

    // Return the first active assignment
    const assignment = assignments[0];
    return this.calendarRepository.findById(assignment.holidayCalendarId);
  }

  /**
   * Remove calendar assignment from employee
   */
  async removeAssignment(assignmentId: number, updatedBy?: number): Promise<void> {
    const assignment = await this.assignmentRepository.findById(assignmentId);

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`);
    }

    assignment.isActive = false;
    assignment.updatedBy = updatedBy ?? null;

    await this.assignmentRepository.save(assignment);

    this.logger.log(`Removed calendar assignment: ${assignmentId}`);
  }

  // ========== Helper Methods ==========

  /**
   * Calculate observed date based on observance rules
   */
  private calculateObservedDate(
    holidayDate: Date,
    holidayObservanceRule: string | null,
    calendarObservanceRules: Record<string, any> | null,
  ): Date | null {
    const date = new Date(holidayDate);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    // Use holiday-specific rule if available, otherwise use calendar rules
    const observanceRule = holidayObservanceRule || calendarObservanceRules?.defaultRule;

    if (!observanceRule) {
      return date;
    }

    // If falls on weekend and should move to Monday
    if ((dayOfWeek === 0 || dayOfWeek === 6) && observanceRule === 'MOVE_TO_MONDAY') {
      const daysToAdd = dayOfWeek === 0 ? 1 : 2; // Sunday -> Monday, Saturday -> Monday
      date.setDate(date.getDate() + daysToAdd);
      return date;
    }

    // If falls on weekend and should move to Friday
    if ((dayOfWeek === 0 || dayOfWeek === 6) && observanceRule === 'MOVE_TO_FRIDAY') {
      const daysToSubtract = dayOfWeek === 0 ? 2 : 1; // Sunday -> Friday, Saturday -> Friday
      date.setDate(date.getDate() - daysToSubtract);
      return date;
    }

    return date;
  }

  /**
   * Calculate recurring holiday date for a given year
   */
  private calculateRecurringHolidayDate(holiday: Holiday, year: number): Date | null {
    if (!holiday.isRecurring) {
      return null;
    }

    const pattern = holiday.recurrencePattern;

    if (pattern === 'ANNUAL' && holiday.recurrenceMonth && holiday.recurrenceDay) {
      // Fixed date (e.g., January 1, December 25)
      return new Date(year, holiday.recurrenceMonth - 1, holiday.recurrenceDay);
    }

    if (pattern === 'FIRST_MONDAY' && holiday.recurrenceMonth && holiday.recurrenceWeekday) {
      // First Monday of month
      return this.calculateNthWeekday(year, holiday.recurrenceMonth, holiday.recurrenceWeekday, 1);
    }

    if (pattern === 'LAST_FRIDAY' && holiday.recurrenceMonth && holiday.recurrenceWeekday) {
      // Last weekday of month
      return this.calculateLastWeekday(year, holiday.recurrenceMonth, holiday.recurrenceWeekday);
    }

    // Default: use original holiday date but change year
    if (holiday.holidayDate) {
      const originalDate = new Date(holiday.holidayDate);
      return new Date(year, originalDate.getMonth(), originalDate.getDate());
    }

    return null;
  }

  /**
   * Calculate nth weekday of month
   */
  private calculateNthWeekday(year: number, month: number, weekday: string, n: number): Date {
    const weekdayMap: Record<string, number> = {
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
      SUNDAY: 0,
    };

    const targetDay = weekdayMap[weekday] || 1;
    const firstDay = new Date(year, month - 1, 1);
    const firstDayOfWeek = firstDay.getDay();

    let daysToAdd = (targetDay - firstDayOfWeek + 7) % 7;
    if (daysToAdd === 0 && firstDayOfWeek !== targetDay) {
      daysToAdd = 7;
    }

    daysToAdd += (n - 1) * 7;

    const result = new Date(year, month - 1, 1 + daysToAdd);
    return result;
  }

  /**
   * Calculate last weekday of month
   */
  private calculateLastWeekday(year: number, month: number, weekday: string): Date {
    const weekdayMap: Record<string, number> = {
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
      SUNDAY: 0,
    };

    const targetDay = weekdayMap[weekday] || 5;
    const lastDay = new Date(year, month, 0); // Last day of month
    const lastDayOfWeek = lastDay.getDay();

    const daysToSubtract = (lastDayOfWeek - targetDay + 7) % 7;

    const result = new Date(year, month - 1, lastDay.getDate() - daysToSubtract);
    return result;
  }

  /**
   * Check if two date ranges overlap
   */
  private datesOverlap(start1: Date, end1: Date | null, start2: Date, end2: Date | null): boolean {
    const end1Date = end1 || new Date('9999-12-31');
    const end2Date = end2 || new Date('9999-12-31');

    return start1 <= end2Date && start2 <= end1Date;
  }
}
