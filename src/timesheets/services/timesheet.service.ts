import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TimesheetRepository } from '../repositories/timesheet.repository';
import { TimesheetPeriodRepository } from '../repositories/timesheet-period.repository';
import { TimesheetEntryRepository } from '../repositories/timesheet-entry.repository';
import { EmployeeRepository } from '../../employees/repositories/employee.repository';
import { WorkflowService } from '../../workflows/services/workflow.service';
import { Timesheet, TimesheetStatus, TimesheetPeriod, TimesheetEntry } from '../entities';
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
} from '../dto';

/**
 * Timesheet Service
 *
 * Manages timesheets, periods, approvals, and exports.
 * Integrates with workflow engine for approval workflows.
 */
@Injectable()
export class TimesheetService {
  private readonly logger = new Logger(TimesheetService.name);

  constructor(
    private readonly timesheetRepository: TimesheetRepository,
    private readonly timesheetPeriodRepository: TimesheetPeriodRepository,
    private readonly timesheetEntryRepository: TimesheetEntryRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly workflowService: WorkflowService,
  ) {}

  /**
   * Create a new timesheet period
   */
  async createTimesheetPeriod(
    createDto: CreateTimesheetPeriodDto,
    createdBy?: number,
  ): Promise<TimesheetPeriodResponseDto> {
    // Check if period key already exists
    const exists = await this.timesheetPeriodRepository.periodKeyExists(createDto.periodKey);

    if (exists) {
      throw new ConflictException(`Period key '${createDto.periodKey}' already exists`);
    }

    // Create timesheet period
    const period = this.timesheetPeriodRepository.create({
      ...createDto,
      isActive: true,
    });

    const saved = await this.timesheetPeriodRepository.save(period);
    const savedEntity = Array.isArray(saved) ? saved[0] : saved;

    this.logger.log(`Created timesheet period: ${savedEntity.id} (${savedEntity.periodKey})`);

    return this.mapToPeriodResponse(savedEntity);
  }

  /**
   * Update a timesheet period
   */
  async updateTimesheetPeriod(
    id: number,
    updateDto: UpdateTimesheetPeriodDto,
    updatedBy?: number,
  ): Promise<TimesheetPeriodResponseDto> {
    const period = await this.timesheetPeriodRepository.findOne({
      where: { id },
    });

    if (!period) {
      throw new NotFoundException(`Timesheet period with ID ${id} not found`);
    }

    // Check period key uniqueness if changed
    if (updateDto.periodKey && updateDto.periodKey !== period.periodKey) {
      const exists = await this.timesheetPeriodRepository.periodKeyExists(updateDto.periodKey, id);

      if (exists) {
        throw new ConflictException(`Period key '${updateDto.periodKey}' already exists`);
      }
    }

    // Update period
    Object.assign(period, updateDto);
    // Note: updatedBy would need to be added to entity if we want to track it

    const saved = await this.timesheetPeriodRepository.save(period);

    this.logger.log(`Updated timesheet period: ${saved.id}`);

    return this.mapToPeriodResponse(saved);
  }

  /**
   * Get or create timesheet for an employee and period
   */
  async getOrCreateTimesheet(
    employeeId: number,
    periodId: number,
    date: Date,
    createdBy?: number,
  ): Promise<TimesheetResponseDto> {
    // Verify employee exists
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    // Verify period exists
    const period = await this.timesheetPeriodRepository.findOne({
      where: { id: periodId },
    });
    if (!period || !period.isActive) {
      throw new NotFoundException(`Timesheet period with ID ${periodId} not found or inactive`);
    }

    // Calculate period dates
    const periodStartDate = period.getPeriodStartDate(date);
    const periodEndDate = period.getPeriodEndDate(date);
    const periodNumber = period.getPeriodNumber(date);

    // Check if timesheet already exists
    let timesheet = await this.timesheetRepository.findByEmployeeAndPeriod(
      employeeId,
      periodId,
      periodStartDate,
    );

    if (!timesheet) {
      // Create new timesheet
      timesheet = this.timesheetRepository.create({
        employeeId,
        periodId,
        periodStartDate,
        periodEndDate,
        periodNumber,
        status: TimesheetStatus.DRAFT,
        totalHours: 0,
        totalBillableHours: 0,
        totalBillingAmount: 0,
        totalCostAmount: 0,
        organizationId: employee.organizationId,
        createdBy,
      });

      timesheet = await this.timesheetRepository.save(timesheet);

      this.logger.log(
        `Timesheet created: employee=${employeeId}, period=${period.periodKey}, start=${periodStartDate}`,
      );
    }

    return this.mapToTimesheetResponse(timesheet, period, employee);
  }

  /**
   * Recalculate timesheet totals from entries
   */
  async recalculateTimesheet(timesheetId: number): Promise<TimesheetResponseDto> {
    const timesheet = await this.timesheetRepository.findById(timesheetId, true);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${timesheetId} not found`);
    }

    if (timesheet.isLocked) {
      throw new BadRequestException('Cannot recalculate locked timesheet');
    }

    // Get entries for the timesheet
    const entries = await this.timesheetEntryRepository.findByTimesheet(timesheetId);

    // Calculate totals
    let totalHours = 0;
    let totalBillableHours = 0;
    let totalBillingAmount = 0;
    let totalCostAmount = 0;

    for (const entry of entries) {
      totalHours += Number(entry.hours);

      if (entry.billable) {
        totalBillableHours += Number(entry.hours);
      }

      if (entry.billingAmount) {
        totalBillingAmount += Number(entry.billingAmount);
      }

      if (entry.costAmount) {
        totalCostAmount += Number(entry.costAmount);
      }
    }

    timesheet.totalHours = totalHours;
    timesheet.totalBillableHours = totalBillableHours;
    timesheet.totalBillingAmount = totalBillingAmount;
    timesheet.totalCostAmount = totalCostAmount;

    const saved = await this.timesheetRepository.save(timesheet);

    this.logger.log(`Timesheet recalculated: id=${timesheetId}, totalHours=${totalHours}`);

    return this.mapToTimesheetResponse(saved, timesheet.period, timesheet.employee);
  }

  /**
   * Submit timesheet for approval
   */
  async submitTimesheet(
    timesheetId: number,
    submitDto: SubmitTimesheetDto,
    submittedBy?: number,
  ): Promise<TimesheetResponseDto> {
    const timesheet = await this.timesheetRepository.findById(timesheetId);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${timesheetId} not found`);
    }

    if (timesheet.status !== TimesheetStatus.DRAFT) {
      throw new BadRequestException('Only draft timesheets can be submitted');
    }

    if (timesheet.isLocked) {
      throw new BadRequestException('Locked timesheets cannot be submitted');
    }

    // Recalculate totals before submission
    await this.recalculateTimesheet(timesheetId);
    const updatedTimesheet = await this.timesheetRepository.findById(timesheetId);

    if (!updatedTimesheet) {
      throw new NotFoundException(`Timesheet with ID ${timesheetId} not found`);
    }

    // Update timesheet status
    updatedTimesheet.status = TimesheetStatus.SUBMITTED;
    updatedTimesheet.submittedAt = new Date();
    updatedTimesheet.submittedBy = submittedBy ?? null;
    updatedTimesheet.notes = submitDto.notes || updatedTimesheet.notes;

    // Start approval workflow if workflow key is provided
    if (submitDto.workflowKey) {
      try {
        const workflowInstance = await this.workflowService.startWorkflow(
          {
            workflowKey: submitDto.workflowKey,
            entityType: 'Timesheet',
            entityId: timesheetId,
            initialData: {
              timesheetId,
              employeeId: updatedTimesheet.employeeId,
              periodId: updatedTimesheet.periodId,
              totalHours: updatedTimesheet.totalHours,
            },
            organizationId: updatedTimesheet.organizationId ?? undefined,
          },
          submittedBy,
        );

        updatedTimesheet.workflowInstanceId = workflowInstance.id;
      } catch (error) {
        this.logger.warn(`Failed to start workflow for timesheet ${timesheetId}: ${error}`);
        // Continue without workflow
      }
    }

    const saved = await this.timesheetRepository.save(updatedTimesheet);
    const savedEntity = Array.isArray(saved) ? saved[0] : saved;

    this.logger.log(`Timesheet submitted: id=${timesheetId}`);

    // Reload with relations
    const reloaded = await this.timesheetRepository.findById(savedEntity.id, true);
    if (!reloaded) {
      throw new NotFoundException(`Timesheet with ID ${savedEntity.id} not found after save`);
    }
    return this.mapToTimesheetResponse(reloaded, reloaded.period, reloaded.employee);
  }

  /**
   * Approve timesheet
   */
  async approveTimesheet(
    timesheetId: number,
    approveDto: ApproveTimesheetDto,
    approvedBy?: number,
  ): Promise<TimesheetResponseDto> {
    const timesheet = await this.timesheetRepository.findById(timesheetId);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${timesheetId} not found`);
    }

    if (timesheet.status !== TimesheetStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted timesheets can be approved');
    }

    // Update timesheet status
    timesheet.status = TimesheetStatus.APPROVED;
    timesheet.approvedAt = new Date();
    timesheet.approvedBy = approvedBy ?? null;
    timesheet.notes = approveDto.notes || timesheet.notes;

    // Lock timesheet after approval
    timesheet.isLocked = true;
    timesheet.lockedAt = new Date();
    timesheet.lockedBy = approvedBy ?? null;
    timesheet.lockReason = 'Approved';

    // Transition workflow if exists
    if (timesheet.workflowInstanceId) {
      try {
        await this.workflowService.transitionWorkflow(
          timesheet.workflowInstanceId,
          {
            transitionName: 'approve',
            comments: approveDto.notes,
          },
          approvedBy,
        );
      } catch (error) {
        this.logger.warn(`Failed to transition workflow for timesheet ${timesheetId}: ${error}`);
      }
    }

    const saved = await this.timesheetRepository.save(timesheet);
    const savedEntity = Array.isArray(saved) ? saved[0] : saved;

    this.logger.log(`Timesheet approved: id=${timesheetId}`);

    // Reload with relations
    const reloaded = await this.timesheetRepository.findById(savedEntity.id, true);
    if (!reloaded) {
      throw new NotFoundException(`Timesheet with ID ${savedEntity.id} not found after save`);
    }
    return this.mapToTimesheetResponse(reloaded, reloaded.period, reloaded.employee);
  }

  /**
   * Reject timesheet
   */
  async rejectTimesheet(
    timesheetId: number,
    rejectDto: RejectTimesheetDto,
    rejectedBy?: number,
  ): Promise<TimesheetResponseDto> {
    const timesheet = await this.timesheetRepository.findById(timesheetId);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${timesheetId} not found`);
    }

    if (timesheet.status !== TimesheetStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted timesheets can be rejected');
    }

    // Update timesheet status
    timesheet.status = TimesheetStatus.REJECTED;
    timesheet.rejectedAt = new Date();
    timesheet.rejectedBy = rejectedBy ?? null;
    timesheet.rejectionReason = rejectDto.reason;

    // Transition workflow if exists
    if (timesheet.workflowInstanceId) {
      try {
        await this.workflowService.transitionWorkflow(
          timesheet.workflowInstanceId,
          {
            transitionName: 'reject',
            comments: rejectDto.reason,
          },
          rejectedBy,
        );
      } catch (error) {
        this.logger.warn(`Failed to transition workflow for timesheet ${timesheetId}: ${error}`);
      }
    }

    const saved = await this.timesheetRepository.save(timesheet);
    const savedEntity = Array.isArray(saved) ? saved[0] : saved;

    this.logger.log(`Timesheet rejected: id=${timesheetId}`);

    // Reload with relations
    const reloaded = await this.timesheetRepository.findById(savedEntity.id, true);
    if (!reloaded) {
      throw new NotFoundException(`Timesheet with ID ${savedEntity.id} not found after save`);
    }
    return this.mapToTimesheetResponse(reloaded, reloaded.period, reloaded.employee);
  }

  /**
   * Get timesheet by ID
   */
  async getTimesheet(id: number): Promise<TimesheetResponseDto> {
    const timesheet = await this.timesheetRepository.findById(id, true);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }

    return this.mapToTimesheetResponse(timesheet, timesheet.period, timesheet.employee);
  }

  /**
   * Get timesheets by employee
   */
  async getTimesheetsByEmployee(employeeId: number): Promise<TimesheetResponseDto[]> {
    const timesheets = await this.timesheetRepository.findByEmployee(employeeId, true);

    return timesheets.map((t) => this.mapToTimesheetResponse(t, t.period, t.employee));
  }

  /**
   * Create timesheet entry
   */
  async createTimesheetEntry(
    timesheetId: number,
    createDto: CreateTimesheetEntryDto,
    createdBy?: number,
  ): Promise<TimesheetEntryResponseDto> {
    const timesheet = await this.timesheetRepository.findById(timesheetId);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${timesheetId} not found`);
    }

    if (!timesheet.canBeEdited()) {
      throw new BadRequestException('Timesheet cannot be edited');
    }

    // Create entry
    const entry = this.timesheetEntryRepository.create({
      ...createDto,
      timesheetId,
      createdBy,
    });

    // Calculate billing/cost amounts if rates are provided
    if (entry.billingRate && entry.hours) {
      entry.billingAmount = Number(entry.billingRate) * Number(entry.hours);
    }

    if (entry.costRate && entry.hours) {
      entry.costAmount = Number(entry.costRate) * Number(entry.hours);
    }

    const saved = await this.timesheetEntryRepository.save(entry);

    // Recalculate timesheet totals
    await this.recalculateTimesheet(timesheetId);

    this.logger.log(`Timesheet entry created: id=${saved.id}`);

    return this.mapToEntryResponse(saved);
  }

  /**
   * Get timesheet period by ID
   */
  async getTimesheetPeriod(id: number): Promise<TimesheetPeriodResponseDto> {
    const period = await this.timesheetPeriodRepository.findOne({
      where: { id },
    });

    if (!period) {
      throw new NotFoundException(`Timesheet period with ID ${id} not found`);
    }

    return this.mapToPeriodResponse(period);
  }

  /**
   * Get all timesheet periods
   */
  async getTimesheetPeriods(): Promise<TimesheetPeriodResponseDto[]> {
    const periods = await this.timesheetPeriodRepository.findAllActive();
    return periods.map((p) => this.mapToPeriodResponse(p));
  }

  /**
   * Map entity to response DTO
   */
  private mapToPeriodResponse(period: TimesheetPeriod): TimesheetPeriodResponseDto {
    return {
      id: period.id,
      periodKey: period.periodKey,
      periodName: period.periodName,
      periodType: period.periodType,
      startDate: period.startDate,
      daysInPeriod: period.daysInPeriod,
      isActive: period.isActive,
      description: period.description,
      organizationId: period.organizationId,
      createdAt: period.createdAt,
      updatedAt: period.updatedAt,
    };
  }

  /**
   * Map timesheet to response DTO
   */
  private mapToTimesheetResponse(
    timesheet: Timesheet,
    period?: TimesheetPeriod,
    employee?: any,
  ): TimesheetResponseDto {
    return {
      id: timesheet.id,
      employeeId: timesheet.employeeId,
      employee: employee
        ? {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
          }
        : undefined,
      periodId: timesheet.periodId,
      period: period ? this.mapToPeriodResponse(period) : undefined,
      periodStartDate: timesheet.periodStartDate,
      periodEndDate: timesheet.periodEndDate,
      periodNumber: timesheet.periodNumber,
      status: timesheet.status,
      totalHours: timesheet.totalHours,
      totalBillableHours: timesheet.totalBillableHours,
      totalBillingAmount: timesheet.totalBillingAmount,
      totalCostAmount: timesheet.totalCostAmount,
      organizationId: timesheet.organizationId,
      submittedAt: timesheet.submittedAt,
      submittedBy: timesheet.submittedBy,
      approvedBy: timesheet.approvedBy,
      approvedAt: timesheet.approvedAt,
      rejectedBy: timesheet.rejectedBy,
      rejectedAt: timesheet.rejectedAt,
      rejectionReason: timesheet.rejectionReason,
      isLocked: timesheet.isLocked,
      lockReason: timesheet.lockReason,
      lockedAt: timesheet.lockedAt,
      lockedBy: timesheet.lockedBy,
      notes: timesheet.notes,
      workflowInstanceId: timesheet.workflowInstanceId,
      createdAt: timesheet.createdAt,
      updatedAt: timesheet.updatedAt,
      createdBy: timesheet.createdBy,
      updatedBy: timesheet.updatedBy,
    };
  }

  /**
   * Map entry to response DTO
   */
  private mapToEntryResponse(entry: TimesheetEntry): TimesheetEntryResponseDto {
    return {
      id: entry.id,
      timesheetId: entry.timesheetId,
      entryDate: entry.entryDate,
      hours: entry.hours,
      billable: entry.billable,
      projectId: entry.projectId,
      taskId: entry.taskId,
      description: entry.description,
      billingRate: entry.billingRate,
      billingAmount: entry.billingAmount,
      costRate: entry.costRate,
      costAmount: entry.costAmount,
      entryMetadata: entry.entryMetadata,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      createdBy: entry.createdBy,
      updatedBy: entry.updatedBy,
    };
  }
}
