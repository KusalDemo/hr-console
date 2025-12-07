import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { LeaveRequestRepository } from '../repositories/leave-request.repository';
import { LeaveRequest, LeaveRequestStatus } from '../entities/leave-request.entity';
import { WorkflowService } from '../../workflows/services/workflow.service';
import { Employee } from '../../employees/entities/employee.entity';

/**
 * Leave Request Service
 *
 * Manages leave requests with:
 * - Leave request CRUD operations
 * - Workflow integration for approvals
 * - Approval routing based on department, amount, duration
 * - Delegation support
 */
@Injectable()
export class LeaveRequestService {
  private readonly logger = new Logger(LeaveRequestService.name);

  constructor(
    private readonly leaveRequestRepository: LeaveRequestRepository,
    private readonly workflowService: WorkflowService,
  ) {}

  /**
   * Create a new leave request
   */
  async createLeaveRequest(
    createDto: {
      employeeId: number;
      startDate: Date;
      endDate: Date;
      leaveTypeId?: number;
      type?: string;
      reason?: string;
      notes?: string;
    },
    createdBy?: number,
  ): Promise<LeaveRequest> {
    // Calculate number of days
    const numberOfDays = this.calculateDays(createDto.startDate, createDto.endDate);

    const leaveRequest = this.leaveRequestRepository.create({
      ...createDto,
      numberOfDays,
      status: LeaveRequestStatus.PENDING,
      createdBy,
    });

    const saved = await this.leaveRequestRepository.save(leaveRequest);

    // Start approval workflow if configured
    try {
      const workflowInstance = await this.workflowService.startWorkflow(
        {
          workflowKey: 'leave_request_approval',
          entityType: 'leave_request',
          entityId: saved.id,
          initialData: {
            employeeId: createDto.employeeId,
            startDate: createDto.startDate.toISOString(),
            endDate: createDto.endDate.toISOString(),
            numberOfDays,
            leaveTypeId: createDto.leaveTypeId,
            departmentId: (saved.employee as any)?.departmentId, // Will be populated if relation loaded
            amount: numberOfDays, // For routing purposes
            duration: numberOfDays, // For routing purposes
          },
          organizationId: saved.organizationId,
        },
        createdBy,
      );

      // Store workflow instance ID in metadata
      saved.requestMetadata = {
        ...saved.requestMetadata,
        workflowInstanceId: workflowInstance.id,
      };
      await this.leaveRequestRepository.save(saved);
    } catch (error) {
      this.logger.warn(
        `Failed to start approval workflow for leave request ${saved.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Continue without workflow
    }

    this.logger.log(`Created leave request: ${saved.id} for employee ${createDto.employeeId}`);

    return saved;
  }

  /**
   * Get leave request by ID
   */
  async getLeaveRequestById(id: number): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findById(id);

    if (!leaveRequest) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    return leaveRequest;
  }

  /**
   * Update leave request
   */
  async updateLeaveRequest(
    id: number,
    updateDto: {
      startDate?: Date;
      endDate?: Date;
      reason?: string;
      notes?: string;
    },
    updatedBy?: number,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findById(id);

    if (!leaveRequest) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    if (leaveRequest.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Cannot update leave request that is not pending');
    }

    if (updateDto.startDate || updateDto.endDate) {
      const startDate = updateDto.startDate || leaveRequest.startDate;
      const endDate = updateDto.endDate || leaveRequest.endDate;
      leaveRequest.numberOfDays = this.calculateDays(startDate, endDate);
      leaveRequest.startDate = startDate;
      leaveRequest.endDate = endDate;
    }

    if (updateDto.reason !== undefined) {
      leaveRequest.reason = updateDto.reason;
    }

    if (updateDto.notes !== undefined) {
      leaveRequest.notes = updateDto.notes;
    }

    leaveRequest.updatedBy = updatedBy ?? null;

    const saved = await this.leaveRequestRepository.save(leaveRequest);

    this.logger.log(`Updated leave request: ${id}`);

    return saved;
  }

  /**
   * Cancel leave request
   */
  async cancelLeaveRequest(id: number, cancelledBy?: number): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findById(id);

    if (!leaveRequest) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    if (leaveRequest.status !== LeaveRequestStatus.PENDING) {
      throw new BadRequestException('Cannot cancel leave request that is not pending');
    }

    leaveRequest.status = LeaveRequestStatus.CANCELLED;
    leaveRequest.updatedBy = cancelledBy ?? null;

    // Cancel workflow if exists
    if (leaveRequest.requestMetadata?.workflowInstanceId) {
      try {
        await this.workflowService.cancelWorkflowInstance(
          leaveRequest.requestMetadata.workflowInstanceId,
          'Leave request cancelled',
          cancelledBy,
        );
      } catch (error) {
        this.logger.warn(`Failed to cancel workflow: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const saved = await this.leaveRequestRepository.save(leaveRequest);

    this.logger.log(`Cancelled leave request: ${id}`);

    return saved;
  }

  /**
   * Get leave requests by employee
   */
  async getLeaveRequestsByEmployee(
    employeeId: number,
    includeCompleted = false,
  ): Promise<LeaveRequest[]> {
    return this.leaveRequestRepository.findByEmployee(employeeId, includeCompleted);
  }

  /**
   * Calculate number of days between two dates
   */
  private calculateDays(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    return diffDays;
  }
}
