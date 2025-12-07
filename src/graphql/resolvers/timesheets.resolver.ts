import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TimesheetService } from '../../timesheets/services/timesheet.service';
import { TimesheetRepository } from '../../timesheets/repositories/timesheet.repository';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Timesheet, TimesheetEntry } from '../../timesheets/entities';
import { Employee } from '../../employees/entities/employee.entity';
import { EmployeeDataLoader } from '../dataloaders/employee.dataloader';
import {
  CreateTimesheetDto,
  SubmitTimesheetDto,
  ApproveTimesheetDto,
  RejectTimesheetDto,
  CreateTimesheetEntryDto,
} from '../../timesheets/dto';

/**
 * Timesheet GraphQL Object Type
 * Auto-generated from Timesheet entity
 */
@Resolver(() => Timesheet)
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimesheetsResolver {
  constructor(
    private readonly timesheetService: TimesheetService,
    private readonly timesheetRepository: TimesheetRepository,
    private readonly employeeDataLoader: EmployeeDataLoader,
  ) {}

  /**
   * Query: Get timesheet by ID
   */
  @Query(() => Timesheet, { name: 'timesheet', nullable: true })
  @Roles('ROLE_USER', 'ROLE_ADMIN', 'ROLE_HR')
  async getTimesheet(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<Timesheet | null> {
    const timesheet = await this.timesheetRepository.findById(id);
    if (!timesheet) {
      return null;
    }

    // Check permissions - users can only view their own timesheets unless they have admin/HR role
    if (timesheet.employeeId !== user.userId) {
      const hasAdminRole = user.roles?.some((role) =>
        ['ROLE_ADMIN', 'ROLE_HR'].includes(role),
      );
      if (!hasAdminRole) {
        throw new Error('Insufficient permissions to view this timesheet');
      }
    }

    return timesheet;
  }

  /**
   * Query: Get timesheets for an employee
   */
  @Query(() => [Timesheet], { name: 'timesheets' })
  @Roles('ROLE_USER', 'ROLE_ADMIN', 'ROLE_HR')
  async getTimesheets(
    @Args('employeeId', { type: () => Int, nullable: true }) employeeId?: number,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 })
    take: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<Timesheet[]> {
    // If no employeeId specified, default to current user's employee record
    const targetEmployeeId = employeeId || user.userId;

    // Check permissions - users can only view their own timesheets unless they have admin/HR role
    if (targetEmployeeId !== user.userId) {
      const hasAdminRole = user.roles?.some((role) =>
        ['ROLE_ADMIN', 'ROLE_HR'].includes(role),
      );
      if (!hasAdminRole) {
        throw new Error('Insufficient permissions to view these timesheets');
      }
    }

    const timesheets = await this.timesheetRepository.findByEmployee(
      targetEmployeeId,
      {
        skip,
        take: Math.min(take, 100), // Limit to 100 max
      },
    );
    return timesheets;
  }

  /**
   * Mutation: Create timesheet
   */
  @Mutation(() => Timesheet)
  @Roles('ROLE_USER', 'ROLE_ADMIN', 'ROLE_HR')
  async createTimesheet(
    @Args('input') input: CreateTimesheetDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Timesheet> {
    const timesheetResponse = await this.timesheetService.createTimesheet(
      input,
      user.userId,
    );
    // Fetch full entity for GraphQL response
    return this.timesheetRepository.findById(timesheetResponse.id);
  }

  /**
   * Mutation: Submit timesheet for approval
   */
  @Mutation(() => Timesheet)
  @Roles('ROLE_USER', 'ROLE_ADMIN', 'ROLE_HR')
  async submitTimesheet(
    @Args('id', { type: () => Int }) id: number,
    @Args('input', { nullable: true }) input: SubmitTimesheetDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Timesheet> {
    await this.timesheetService.submitTimesheet(id, input, user.userId);
    return this.timesheetRepository.findById(id);
  }

  /**
   * Mutation: Approve timesheet
   */
  @Mutation(() => Timesheet)
  @Roles('ROLE_ADMIN', 'ROLE_HR')
  async approveTimesheet(
    @Args('id', { type: () => Int }) id: number,
    @Args('input', { nullable: true }) input: ApproveTimesheetDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Timesheet> {
    await this.timesheetService.approveTimesheet(id, input, user.userId);
    return this.timesheetRepository.findById(id);
  }

  /**
   * Mutation: Reject timesheet
   */
  @Mutation(() => Timesheet)
  @Roles('ROLE_ADMIN', 'ROLE_HR')
  async rejectTimesheet(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: RejectTimesheetDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Timesheet> {
    await this.timesheetService.rejectTimesheet(id, input, user.userId);
    return this.timesheetRepository.findById(id);
  }

  /**
   * Resolve field: employee
   * Uses DataLoader to batch load employees
   */
  @ResolveField(() => Employee)
  async employee(@Parent() timesheet: Timesheet): Promise<Employee> {
    return this.employeeDataLoader.load(timesheet.employeeId);
  }
}

/**
 * TimesheetEntry GraphQL Object Type
 * Auto-generated from TimesheetEntry entity
 */
@Resolver(() => TimesheetEntry)
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimesheetEntriesResolver {
  constructor(
    private readonly timesheetService: TimesheetService,
    private readonly employeeDataLoader: EmployeeDataLoader,
  ) {}

  /**
   * Mutation: Create timesheet entry
   */
  @Mutation(() => TimesheetEntry)
  @Roles('ROLE_USER', 'ROLE_ADMIN', 'ROLE_HR')
  async createTimesheetEntry(
    @Args('input') input: CreateTimesheetEntryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TimesheetEntry> {
    const entryResponse = await this.timesheetService.createTimesheetEntry(
      input,
      user.userId,
    );
    // Return the created entry (would need to fetch from repository)
    // For now, return a partial response
    return entryResponse as any;
  }
}
