import { Resolver, Query, Mutation, Args, Int, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { TimesheetService } from '../../timesheets/services/timesheet.service';
import { TimesheetRepository } from '../../timesheets/repositories/timesheet.repository';
import { TimesheetEntryRepository } from '../../timesheets/repositories/timesheet-entry.repository';
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
      const hasAdminRole = user.roles?.some((role) => ['ROLE_ADMIN', 'ROLE_HR'].includes(role));
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
    @CurrentUser() user: JwtPayload,
    @Args('employeeId', { type: () => Int, nullable: true }) employeeId?: number,
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number = 0,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 })
    take: number = 20,
  ): Promise<Timesheet[]> {
    // If no employeeId specified, default to current user's employee record
    const targetEmployeeId = employeeId || user.userId;

    // Check permissions - users can only view their own timesheets unless they have admin/HR role
    if (targetEmployeeId !== user.userId) {
      const hasAdminRole = user.roles?.some((role) => ['ROLE_ADMIN', 'ROLE_HR'].includes(role));
      if (!hasAdminRole) {
        throw new Error('Insufficient permissions to view these timesheets');
      }
    }

    const timesheets = await this.timesheetRepository.findByEmployee(targetEmployeeId);
    return timesheets.slice(skip, skip + Math.min(take, 100));
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
    const timesheetResponse = await this.timesheetService.getOrCreateTimesheet(
      input.employeeId,
      input.periodId,
      new Date(input.date),
      user.userId,
    );
    // Fetch full entity for GraphQL response
    const timesheet = await this.timesheetRepository.findById(timesheetResponse.id);
    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${timesheetResponse.id} not found`);
    }
    return timesheet;
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
    const timesheet = await this.timesheetRepository.findById(id);
    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }
    return timesheet;
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
    const timesheet = await this.timesheetRepository.findById(id);
    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }
    return timesheet;
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
    const timesheet = await this.timesheetRepository.findById(id);
    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }
    return timesheet;
  }

  /**
   * Resolve field: employee
   * Uses DataLoader to batch load employees
   */
  @ResolveField(() => Employee, { nullable: true })
  async employee(@Parent() timesheet: Timesheet): Promise<Employee | null> {
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
    private readonly timesheetEntryRepository: TimesheetEntryRepository,
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
    if (!input.timesheetId) {
      throw new BadRequestException('timesheetId is required');
    }
    const entryResponse = await this.timesheetService.createTimesheetEntry(
      input.timesheetId,
      input,
      user.userId,
    );
    // Fetch the entry from repository
    const entry = await this.timesheetEntryRepository.findOne({
      where: { id: entryResponse.id },
      relations: ['timesheet'],
    });
    if (!entry) {
      throw new NotFoundException(`Timesheet entry with ID ${entryResponse.id} not found`);
    }
    return entry;
  }
}
