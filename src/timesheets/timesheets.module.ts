import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimesheetsController } from './timesheets.controller';
import { TimesheetService } from './services';
import {
  TimesheetPeriodRepository,
  TimesheetRepository,
  TimesheetEntryRepository,
} from './repositories';
import { TimesheetPeriod, Timesheet, TimesheetEntry } from './entities';
import { EmployeeRepository } from '../employees/repositories/employee.repository';
import { Employee } from '../employees/entities/employee.entity';
import { WorkflowsModule } from '../workflows/workflows.module';

/**
 * Timesheets Module
 * 
 * Provides period-based timesheets with approval workflow integration.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TimesheetPeriod, Timesheet, TimesheetEntry, Employee]),
    WorkflowsModule, // For approval workflow integration
  ],
  controllers: [TimesheetsController],
  providers: [
    TimesheetService,
    TimesheetPeriodRepository,
    TimesheetRepository,
    TimesheetEntryRepository,
    EmployeeRepository,
  ],
  exports: [
    TimesheetService,
    TimesheetPeriodRepository,
    TimesheetRepository,
    TimesheetEntryRepository,
  ],
})
export class TimesheetsModule {}


