import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TimesheetService } from './services/timesheet.service';
import {
  CreateTimesheetPeriodDto,
  UpdateTimesheetPeriodDto,
  CreateTimesheetDto,
  SubmitTimesheetDto,
  ApproveTimesheetDto,
  RejectTimesheetDto,
  CreateTimesheetEntryDto,
  TimesheetPeriodResponseDto,
  TimesheetResponseDto,
  TimesheetEntryResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * Timesheets Controller
 * 
 * REST API endpoints for timesheet management:
 * - Timesheet periods (CRUD)
 * - Timesheets (create, get, submit, approve, reject)
 * - Timesheet entries (create)
 */
@Controller('timesheets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimesheetsController {
  constructor(private readonly timesheetService: TimesheetService) {}

  /**
   * Create a new timesheet period
   * POST /timesheets/periods
   */
  @Post('periods')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.CREATED)
  async createTimesheetPeriod(
    @Body() createDto: CreateTimesheetPeriodDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TimesheetPeriodResponseDto> {
    return this.timesheetService.createTimesheetPeriod(createDto, user.userId);
  }

  /**
   * Get all timesheet periods
   * GET /timesheets/periods
   */
  @Get('periods')
  async getTimesheetPeriods(): Promise<TimesheetPeriodResponseDto[]> {
    return this.timesheetService.getTimesheetPeriods();
  }

  /**
   * Get timesheet period by ID
   * GET /timesheets/periods/:id
   */
  @Get('periods/:id')
  async getTimesheetPeriod(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TimesheetPeriodResponseDto> {
    return this.timesheetService.getTimesheetPeriod(id);
  }

  /**
   * Update timesheet period
   * PUT /timesheets/periods/:id
   */
  @Put('periods/:id')
  @Roles('ADMIN', 'HR')
  async updateTimesheetPeriod(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTimesheetPeriodDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TimesheetPeriodResponseDto> {
    return this.timesheetService.updateTimesheetPeriod(id, updateDto, user.userId);
  }

  /**
   * Get or create timesheet for employee and period
   * POST /timesheets
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async getOrCreateTimesheet(
    @Body() createDto: CreateTimesheetDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TimesheetResponseDto> {
    return this.timesheetService.getOrCreateTimesheet(
      createDto.employeeId,
      createDto.periodId,
      new Date(createDto.date),
      user.userId,
    );
  }

  /**
   * Get timesheet by ID
   * GET /timesheets/:id
   */
  @Get(':id')
  async getTimesheet(@Param('id', ParseIntPipe) id: number): Promise<TimesheetResponseDto> {
    return this.timesheetService.getTimesheet(id);
  }

  /**
   * Get timesheets by employee
   * GET /timesheets/employee/:employeeId
   */
  @Get('employee/:employeeId')
  async getTimesheetsByEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
  ): Promise<TimesheetResponseDto[]> {
    return this.timesheetService.getTimesheetsByEmployee(employeeId);
  }

  /**
   * Recalculate timesheet totals
   * POST /timesheets/:id/recalculate
   */
  @Post(':id/recalculate')
  async recalculateTimesheet(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TimesheetResponseDto> {
    return this.timesheetService.recalculateTimesheet(id);
  }

  /**
   * Submit timesheet for approval
   * POST /timesheets/:id/submit
   */
  @Post(':id/submit')
  async submitTimesheet(
    @Param('id', ParseIntPipe) id: number,
    @Body() submitDto: SubmitTimesheetDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TimesheetResponseDto> {
    return this.timesheetService.submitTimesheet(id, submitDto, user.userId);
  }

  /**
   * Approve timesheet
   * POST /timesheets/:id/approve
   */
  @Post(':id/approve')
  @Roles('ADMIN', 'HR', 'MANAGER')
  async approveTimesheet(
    @Param('id', ParseIntPipe) id: number,
    @Body() approveDto: ApproveTimesheetDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TimesheetResponseDto> {
    return this.timesheetService.approveTimesheet(id, approveDto, user.userId);
  }

  /**
   * Reject timesheet
   * POST /timesheets/:id/reject
   */
  @Post(':id/reject')
  @Roles('ADMIN', 'HR', 'MANAGER')
  async rejectTimesheet(
    @Param('id', ParseIntPipe) id: number,
    @Body() rejectDto: RejectTimesheetDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TimesheetResponseDto> {
    return this.timesheetService.rejectTimesheet(id, rejectDto, user.userId);
  }

  /**
   * Create timesheet entry
   * POST /timesheets/:id/entries
   */
  @Post(':id/entries')
  @HttpCode(HttpStatus.CREATED)
  async createTimesheetEntry(
    @Param('id', ParseIntPipe) timesheetId: number,
    @Body() createDto: CreateTimesheetEntryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TimesheetEntryResponseDto> {
    return this.timesheetService.createTimesheetEntry(timesheetId, createDto, user.userId);
  }
}

