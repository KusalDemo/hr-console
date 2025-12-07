import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HolidaysController } from './holidays.controller';
import { HolidayService } from './services';
import {
  HolidayCalendarRepository,
  HolidayRepository,
  EmployeeHolidayCalendarAssignmentRepository,
} from './repositories';
import { HolidayCalendar, Holiday, EmployeeHolidayCalendarAssignment } from './entities';
import { Employee } from '../employees/entities/employee.entity';
import { Organization } from '../organizations/entities/organization.entity';

/**
 * Holidays Module
 *
 * Provides holiday calendar management with:
 * - Holiday calendar CRUD operations
 * - Holiday management (fixed, recurring, floating)
 * - Calendar assignment to employees/organizations
 * - Holiday observance calculation
 * - Integration with leave policies for automatic deduction
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      HolidayCalendar,
      Holiday,
      EmployeeHolidayCalendarAssignment,
      Employee,
      Organization,
    ]),
  ],
  controllers: [HolidaysController],
  providers: [
    HolidayService,
    HolidayCalendarRepository,
    HolidayRepository,
    EmployeeHolidayCalendarAssignmentRepository,
  ],
  exports: [
    HolidayService,
    HolidayCalendarRepository,
    HolidayRepository,
    EmployeeHolidayCalendarAssignmentRepository,
  ],
})
export class HolidaysModule {}
