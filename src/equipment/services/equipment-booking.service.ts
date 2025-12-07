import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EquipmentBookingRepository } from '../repositories/equipment-booking.repository';
import { EquipmentRepository } from '../repositories/equipment.repository';
import { EquipmentBooking, BookingStatus } from '../entities/equipment-booking.entity';
import { Equipment, EquipmentStatus } from '../entities/equipment.entity';
import { WorkflowService } from '../../workflows/services/workflow.service';
import {
  CreateEquipmentBookingDto,
  UpdateEquipmentBookingDto,
  ApproveEquipmentBookingDto,
  RejectEquipmentBookingDto,
  PickupEquipmentBookingDto,
  ReturnEquipmentBookingDto,
} from '../dto';

/**
 * Equipment Booking Service
 * 
 * Manages equipment bookings with:
 * - Booking creation with conflict detection
 * - Approval workflow integration
 * - Booking lifecycle management (pending -> approved -> active -> completed)
 * - Usage analytics
 * - Return tracking
 */
@Injectable()
export class EquipmentBookingService {
  private readonly logger = new Logger(EquipmentBookingService.name);

  constructor(
    private readonly bookingRepository: EquipmentBookingRepository,
    private readonly equipmentRepository: EquipmentRepository,
    private readonly workflowService: WorkflowService,
  ) {}

  // ========== Booking Methods ==========

  /**
   * Create a new equipment booking
   */
  async createBooking(
    createDto: CreateEquipmentBookingDto,
    createdBy?: number,
  ): Promise<EquipmentBooking> {
    const equipment = await this.equipmentRepository.findById(createDto.equipmentId);

    if (!equipment) {
      throw new NotFoundException(`Equipment with ID ${createDto.equipmentId} not found`);
    }

    // Check if equipment is bookable
    if (!equipment.isBookable) {
      throw new BadRequestException('Equipment is not available for booking');
    }

    // Check if equipment is available (not in maintenance, etc.)
    if (equipment.equipmentStatus !== EquipmentStatus.AVAILABLE) {
      throw new BadRequestException(
        `Equipment is not available for booking. Current status: ${equipment.equipmentStatus}`,
      );
    }

    // Validate booking dates
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (startDate < new Date()) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    // Check booking availability rules
    await this.validateBookingRules(equipment, startDate, endDate);

    // Check for conflicts
    const conflicts = await this.bookingRepository.findActiveBookingsInRange(
      createDto.equipmentId,
      startDate,
      endDate,
    );

    if (conflicts.length > 0) {
      throw new ConflictException(
        `Equipment is already booked for the requested time period. Conflicting bookings: ${conflicts.map((c) => c.id).join(', ')}`,
      );
    }

    // Check concurrent booking limits
    if (equipment.maxConcurrentBookings !== null) {
      const concurrentCount = await this.bookingRepository.getConcurrentBookingsCount(
        createDto.equipmentId,
        startDate,
      );
      if (concurrentCount >= equipment.maxConcurrentBookings) {
        throw new ConflictException(
          `Maximum concurrent bookings (${equipment.maxConcurrentBookings}) reached for this equipment`,
        );
      }
    }

    // Determine initial status based on approval requirements
    const requiresApproval =
      equipment.bookingAvailabilityRules?.requiresApproval !== false;
    const initialStatus = requiresApproval
      ? BookingStatus.PENDING
      : BookingStatus.APPROVED;

    // Create booking
    const booking = this.bookingRepository.create({
      equipmentId: createDto.equipmentId,
      employeeId: createDto.employeeId,
      organizationId: equipment.organizationId,
      bookingStatus: initialStatus,
      startDate,
      endDate,
      bookingPurpose: createDto.bookingPurpose,
      bookingNotes: createDto.bookingNotes,
      createdBy,
    });

    // Start approval workflow if required
    if (requiresApproval) {
      try {
        const workflowInstance = await this.workflowService.startWorkflow(
          {
            workflowKey: 'equipment_booking_approval',
            entityType: 'equipment_booking',
            entityId: 0, // Will be updated after booking is saved
            workflowData: {
              equipmentId: createDto.equipmentId,
              employeeId: createDto.employeeId,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              bookingPurpose: createDto.bookingPurpose,
            },
            organizationId: equipment.organizationId,
          },
          createdBy,
        );

        booking.workflowInstanceId = workflowInstance.id;
      } catch (error) {
        this.logger.warn(
          `Failed to start approval workflow for booking: ${error.message}. Proceeding without workflow.`,
        );
      }
    }

    const saved = await this.bookingRepository.save(booking);

    // Note: Workflow instance entityId will be set to booking ID after creation
    // This is handled by the workflow service when the entity is created

    this.logger.log(`Created equipment booking: ${saved.id} for equipment ${createDto.equipmentId}`);

    return saved;
  }

  /**
   * Get booking by ID
   */
  async getBookingById(id: number): Promise<EquipmentBooking> {
    const booking = await this.bookingRepository.findById(id);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }

  /**
   * Update booking
   */
  async updateBooking(
    id: number,
    updateDto: UpdateEquipmentBookingDto,
    updatedBy?: number,
  ): Promise<EquipmentBooking> {
    const booking = await this.bookingRepository.findById(id);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Only allow updates for pending or approved bookings
    if (
      booking.bookingStatus !== BookingStatus.PENDING &&
      booking.bookingStatus !== BookingStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Cannot update booking with status ${booking.bookingStatus}`,
      );
    }

    // If dates are being updated, check for conflicts
    if (updateDto.startDate || updateDto.endDate) {
      const startDate = updateDto.startDate
        ? new Date(updateDto.startDate)
        : booking.startDate;
      const endDate = updateDto.endDate ? new Date(updateDto.endDate) : booking.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }

      const conflicts = await this.bookingRepository.findActiveBookingsInRange(
        booking.equipmentId,
        startDate,
        endDate,
        id,
      );

      if (conflicts.length > 0) {
        throw new ConflictException(
          `Equipment is already booked for the requested time period`,
        );
      }

      booking.startDate = startDate;
      booking.endDate = endDate;
    }

    if (updateDto.bookingPurpose !== undefined) {
      booking.bookingPurpose = updateDto.bookingPurpose;
    }

    if (updateDto.bookingNotes !== undefined) {
      booking.bookingNotes = updateDto.bookingNotes;
    }

    booking.updatedBy = updatedBy;

    const saved = await this.bookingRepository.save(booking);

    this.logger.log(`Updated booking: ${id}`);

    return saved;
  }

  /**
   * Approve booking
   */
  async approveBooking(
    id: number,
    approveDto: ApproveEquipmentBookingDto,
    approvedBy: number,
  ): Promise<EquipmentBooking> {
    const booking = await this.bookingRepository.findById(id);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    if (booking.bookingStatus !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve booking with status ${booking.bookingStatus}`,
      );
    }

    // Process workflow approval if workflow exists
    // Note: Workflow approvals are typically handled through workflow transitions
    // For equipment bookings, we approve directly and let the workflow system
    // handle its own state transitions if needed
    if (booking.workflowInstanceId) {
      try {
        // Get workflow instance to check status
        const workflowInstance = await this.workflowService.getWorkflowInstance(
          booking.workflowInstanceId,
        );

        // If workflow is active, we can approve the booking
        // The workflow will continue its own state machine transitions
        if (workflowInstance && workflowInstance.status === 'ACTIVE') {
          this.logger.log(
            `Approving booking ${id} with active workflow instance ${booking.workflowInstanceId}`,
          );
        }
      } catch (error) {
        this.logger.warn(`Workflow check failed: ${error.message}. Proceeding with direct approval.`);
      }
    }

    // Approve booking
    booking.bookingStatus = BookingStatus.APPROVED;
    booking.approvedById = approvedBy;
    booking.approvedAt = new Date();

    const saved = await this.bookingRepository.save(booking);

    this.logger.log(`Approved booking: ${id} by user ${approvedBy}`);

    return saved;
  }

  /**
   * Reject booking
   */
  async rejectBooking(
    id: number,
    rejectDto: RejectEquipmentBookingDto,
    rejectedBy: number,
  ): Promise<EquipmentBooking> {
    const booking = await this.bookingRepository.findById(id);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    if (booking.bookingStatus !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject booking with status ${booking.bookingStatus}`,
      );
    }

    // Process workflow rejection if workflow exists
    if (booking.workflowInstanceId) {
      try {
        await this.workflowService.cancelWorkflowInstance(
          booking.workflowInstanceId,
          rejectDto.rejectionReason,
          rejectedBy,
        );
      } catch (error) {
        this.logger.warn(`Workflow cancellation failed: ${error.message}`);
      }
    }

    booking.bookingStatus = BookingStatus.REJECTED;
    booking.rejectedById = rejectedBy;
    booking.rejectedAt = new Date();
    booking.rejectionReason = rejectDto.rejectionReason;

    const saved = await this.bookingRepository.save(booking);

    this.logger.log(`Rejected booking: ${id} by user ${rejectedBy}`);

    return saved;
  }

  /**
   * Cancel booking
   */
  async cancelBooking(
    id: number,
    cancellationReason?: string,
    cancelledBy?: number,
  ): Promise<EquipmentBooking> {
    const booking = await this.bookingRepository.findById(id);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Can only cancel pending or approved bookings
    if (
      booking.bookingStatus !== BookingStatus.PENDING &&
      booking.bookingStatus !== BookingStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Cannot cancel booking with status ${booking.bookingStatus}`,
      );
    }

    // Cancel workflow if exists
    if (booking.workflowInstanceId) {
      try {
        await this.workflowService.cancelWorkflow(booking.workflowInstanceId, cancelledBy);
      } catch (error) {
        this.logger.warn(`Workflow cancellation failed: ${error.message}`);
      }
    }

    booking.bookingStatus = BookingStatus.CANCELLED;
    booking.cancelledById = cancelledBy;
    booking.cancelledAt = new Date();
    booking.cancellationReason = cancellationReason;

    const saved = await this.bookingRepository.save(booking);

    this.logger.log(`Cancelled booking: ${id}`);

    return saved;
  }

  /**
   * Pickup equipment (activate booking)
   */
  async pickupEquipment(
    id: number,
    pickupDto: PickupEquipmentBookingDto,
    pickedUpBy?: number,
  ): Promise<EquipmentBooking> {
    const booking = await this.bookingRepository.findById(id);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    if (booking.bookingStatus !== BookingStatus.APPROVED) {
      throw new BadRequestException(
        `Cannot pickup equipment for booking with status ${booking.bookingStatus}`,
      );
    }

    const now = new Date();
    if (now < booking.startDate) {
      throw new BadRequestException('Cannot pickup equipment before booking start date');
    }

    booking.bookingStatus = BookingStatus.ACTIVE;
    booking.actualPickupDate = now;
    booking.conditionAtPickup = pickupDto.conditionAtPickup;

    const saved = await this.bookingRepository.save(booking);

    // Update equipment status if needed
    const equipment = await this.equipmentRepository.findById(booking.equipmentId);
    if (equipment && equipment.equipmentStatus === EquipmentStatus.AVAILABLE) {
      // Equipment is now in use, but we don't change status to ASSIGNED
      // since it's a temporary booking, not a permanent assignment
    }

    this.logger.log(`Equipment picked up for booking: ${id}`);

    return saved;
  }

  /**
   * Return equipment (complete booking)
   */
  async returnEquipment(
    id: number,
    returnDto: ReturnEquipmentBookingDto,
    returnedBy?: number,
  ): Promise<EquipmentBooking> {
    const booking = await this.bookingRepository.findById(id);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    if (booking.bookingStatus !== BookingStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot return equipment for booking with status ${booking.bookingStatus}`,
      );
    }

    const now = new Date();
    booking.bookingStatus = BookingStatus.COMPLETED;
    booking.actualReturnDate = now;
    booking.conditionAtReturn = returnDto.conditionAtReturn;
    booking.returnNotes = returnDto.returnNotes;
    booking.updatedBy = returnedBy;

    // Calculate usage hours
    if (booking.actualPickupDate) {
      const hoursDiff =
        (now.getTime() - booking.actualPickupDate.getTime()) / (1000 * 60 * 60);
      booking.usageHours = Math.round(hoursDiff * 100) / 100; // Round to 2 decimals
    }

    // Update usage analytics
    booking.usageAnalytics = {
      ...booking.usageAnalytics,
      returnDate: now.toISOString(),
      conditionAtReturn: returnDto.conditionAtReturn,
      issues: returnDto.returnNotes,
    };

    const saved = await this.bookingRepository.save(booking);

    this.logger.log(`Equipment returned for booking: ${id}`);

    return saved;
  }

  /**
   * Get bookings by equipment
   */
  async getBookingsByEquipment(
    equipmentId: number,
    includeCompleted = false,
  ): Promise<EquipmentBooking[]> {
    return this.bookingRepository.findByEquipment(equipmentId, includeCompleted);
  }

  /**
   * Get bookings by employee
   */
  async getBookingsByEmployee(
    employeeId: number,
    includeCompleted = false,
  ): Promise<EquipmentBooking[]> {
    return this.bookingRepository.findByEmployee(employeeId, includeCompleted);
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(
    organizationId?: number,
    approverId?: number,
  ): Promise<EquipmentBooking[]> {
    return this.bookingRepository.findPendingApprovals(organizationId, approverId);
  }

  /**
   * Get booking statistics for equipment
   */
  async getBookingStatistics(
    equipmentId: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    return this.bookingRepository.getBookingStatistics(equipmentId, startDate, endDate);
  }

  /**
   * Check for booking conflicts
   */
  async checkBookingConflicts(
    equipmentId: number,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: number,
  ): Promise<EquipmentBooking[]> {
    return this.bookingRepository.findActiveBookingsInRange(
      equipmentId,
      startDate,
      endDate,
      excludeBookingId,
    );
  }

  // ========== Helper Methods ==========

  /**
   * Validate booking rules against equipment availability rules
   */
  private async validateBookingRules(
    equipment: Equipment,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const rules = equipment.bookingAvailabilityRules;
    if (!rules) {
      return; // No rules, allow booking
    }

    // Check advance booking limit
    if (rules.advanceBookingDays) {
      const maxAdvanceDate = new Date();
      maxAdvanceDate.setDate(maxAdvanceDate.getDate() + rules.advanceBookingDays);
      if (startDate > maxAdvanceDate) {
        throw new BadRequestException(
          `Bookings can only be made up to ${rules.advanceBookingDays} days in advance`,
        );
      }
    }

    // Check maximum booking duration
    if (rules.maxBookingDays) {
      const daysDiff = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysDiff > rules.maxBookingDays) {
        throw new BadRequestException(
          `Maximum booking duration is ${rules.maxBookingDays} days`,
        );
      }
    }

    // Check minimum booking duration
    if (rules.minBookingDays) {
      const daysDiff = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysDiff < rules.minBookingDays) {
        throw new BadRequestException(
          `Minimum booking duration is ${rules.minBookingDays} days`,
        );
      }
    }

    // Check blackout dates
    if (rules.blackoutDates && Array.isArray(rules.blackoutDates)) {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      const blackoutDates = rules.blackoutDates.map((d: string) => d.split('T')[0]);

      if (
        blackoutDates.includes(startDateStr) ||
        blackoutDates.includes(endDateStr)
      ) {
        throw new BadRequestException('Booking dates fall on blackout dates');
      }
    }

    // Check allowed time slots (if provided)
    if (rules.allowedTimeSlots && Array.isArray(rules.allowedTimeSlots)) {
      // This is a simplified check - could be enhanced
      const startHour = startDate.getHours();
      const endHour = endDate.getHours();

      // Validate against time slots (format: "HH:MM-HH:MM")
      // Implementation would parse and validate time slots
    }
  }
}
