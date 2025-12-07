import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ResourceBookingRepository } from '../repositories/resource-booking.repository';
import { ResourceRepository } from '../repositories/resource.repository';
import { ResourceService } from './resource.service';
import {
  ResourceBooking,
  BookingStatus,
} from '../entities/resource-booking.entity';
import { Resource } from '../entities/resource.entity';

/**
 * Resource Booking Service
 * 
 * Manages resource bookings with:
 * - Booking CRUD operations
 * - Conflict detection algorithms
 * - Approval workflows
 * - Booking policies enforcement
 */
@Injectable()
export class ResourceBookingService {
  private readonly logger = new Logger(ResourceBookingService.name);

  constructor(
    private readonly resourceBookingRepository: ResourceBookingRepository,
    private readonly resourceRepository: ResourceRepository,
    private readonly resourceService: ResourceService,
  ) {}

  /**
   * Create a new booking
   */
  async createBooking(
    createDto: {
      resourceId: number;
      bookedById: number;
      organizationId?: number;
      bookingTitle: string;
      bookingDescription?: string;
      startTime: Date;
      endTime: Date;
      attendeeCount?: number;
      specialRequirements?: string;
      calendarEventId?: number;
      recurrencePattern?: Record<string, any>;
    },
    createdBy?: number,
  ): Promise<ResourceBooking> {
    // Validate time range
    if (createDto.endTime <= createDto.startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Get resource
    const resource = await this.resourceRepository.findById(createDto.resourceId);

    if (!resource) {
      throw new NotFoundException(`Resource with ID ${createDto.resourceId} not found`);
    }

    // Check resource availability
    const availability = await this.resourceService.checkAvailability(
      createDto.resourceId,
      createDto.startTime,
      createDto.endTime,
    );

    if (!availability.available) {
      throw new BadRequestException(`Resource not available: ${availability.reason}`);
    }

    // Check capacity
    if (createDto.attendeeCount && resource.capacity) {
      if (createDto.attendeeCount > resource.capacity) {
        throw new BadRequestException(
          `Attendee count (${createDto.attendeeCount}) exceeds resource capacity (${resource.capacity})`,
        );
      }
    }

    // Check booking duration
    const durationMinutes =
      (createDto.endTime.getTime() - createDto.startTime.getTime()) / (1000 * 60);

    if (resource.minBookingDurationMinutes && durationMinutes < resource.minBookingDurationMinutes) {
      throw new BadRequestException(
        `Booking duration must be at least ${resource.minBookingDurationMinutes} minutes`,
      );
    }

    if (resource.maxBookingDurationMinutes && durationMinutes > resource.maxBookingDurationMinutes) {
      throw new BadRequestException(
        `Booking duration must not exceed ${resource.maxBookingDurationMinutes} minutes`,
      );
    }

    // Check for conflicts
    const conflicts = await this.resourceBookingRepository.findConflictingBookings(
      createDto.resourceId,
      createDto.startTime,
      createDto.endTime,
    );

    if (conflicts.length > 0) {
      throw new ConflictException(
        `Resource is already booked during this time period. Conflicting bookings: ${conflicts.map((c) => c.id).join(', ')}`,
      );
    }

    // Determine initial status
    let initialStatus = BookingStatus.CONFIRMED;
    if (resource.requiresApproval) {
      initialStatus = BookingStatus.PENDING;
    }

    // Create booking
    const booking = this.resourceBookingRepository.create({
      ...createDto,
      bookingStatus: initialStatus,
      hasConflicts: false,
      isRecurring: !!createDto.recurrencePattern,
      createdBy,
    });

    const saved = await this.resourceBookingRepository.save(booking);

    this.logger.log(
      `Created booking: ${saved.id} for resource ${createDto.resourceId} (${initialStatus})`,
    );

    return saved;
  }

  /**
   * Get booking by ID
   */
  async getBookingById(id: number, includeResource = false): Promise<ResourceBooking> {
    const booking = await this.resourceBookingRepository.findById(id, includeResource);

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
    updateDto: {
      bookingTitle?: string;
      bookingDescription?: string;
      startTime?: Date;
      endTime?: Date;
      attendeeCount?: number;
      specialRequirements?: string;
    },
    updatedBy?: number,
  ): Promise<ResourceBooking> {
    const booking = await this.resourceBookingRepository.findById(id, true);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Check if booking can be modified
    if (
      booking.bookingStatus === BookingStatus.CANCELLED ||
      booking.bookingStatus === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException('Cannot modify cancelled or completed booking');
    }

    // If time is being changed, check for conflicts
    if (updateDto.startTime || updateDto.endTime) {
      const newStartTime = updateDto.startTime || booking.startTime;
      const newEndTime = updateDto.endTime || booking.endTime;

      if (newEndTime <= newStartTime) {
        throw new BadRequestException('End time must be after start time');
      }

      // Check for conflicts (excluding current booking)
      const conflicts = await this.resourceBookingRepository.findConflictingBookings(
        booking.resourceId,
        newStartTime,
        newEndTime,
        id,
      );

      if (conflicts.length > 0) {
        throw new ConflictException(
          `Resource is already booked during this time period. Conflicting bookings: ${conflicts.map((c) => c.id).join(', ')}`,
        );
      }

      // Check availability
      const availability = await this.resourceService.checkAvailability(
        booking.resourceId,
        newStartTime,
        newEndTime,
      );

      if (!availability.available) {
        throw new BadRequestException(`Resource not available: ${availability.reason}`);
      }
    }

    Object.assign(booking, {
      ...updateDto,
      updatedBy,
    });

    const saved = await this.resourceBookingRepository.save(booking);

    this.logger.log(`Updated booking: ${id}`);

    return saved;
  }

  /**
   * Cancel booking
   */
  async cancelBooking(
    id: number,
    cancellationReason?: string,
    cancelledBy?: number,
  ): Promise<ResourceBooking> {
    const booking = await this.resourceBookingRepository.findById(id);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    if (booking.bookingStatus === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.bookingStatus === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed booking');
    }

    // Check cancellation policy
    const resource = await this.resourceRepository.findById(booking.resourceId);
    if (resource?.cancellationHours) {
      const hoursUntilStart =
        (booking.startTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);

      if (hoursUntilStart < resource.cancellationHours) {
        throw new BadRequestException(
          `Booking cannot be cancelled less than ${resource.cancellationHours} hours before start time`,
        );
      }
    }

    booking.bookingStatus = BookingStatus.CANCELLED;
    booking.cancellationReason = cancellationReason;
    booking.cancelledById = cancelledBy;
    booking.cancelledAt = new Date();
    booking.updatedBy = cancelledBy;

    const saved = await this.resourceBookingRepository.save(booking);

    this.logger.log(`Cancelled booking: ${id}`);

    return saved;
  }

  /**
   * Approve booking
   */
  async approveBooking(
    id: number,
    approverId: number,
    approvalReason?: string,
  ): Promise<ResourceBooking> {
    const booking = await this.resourceBookingRepository.findById(id);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    if (booking.bookingStatus !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be approved');
    }

    // Check for conflicts again (in case something changed)
    const conflicts = await this.resourceBookingRepository.findConflictingBookings(
      booking.resourceId,
      booking.startTime,
      booking.endTime,
      id,
    );

    if (conflicts.length > 0) {
      booking.hasConflicts = true;
      booking.conflictDetails = conflicts.map((c) => c.id);
      await this.resourceBookingRepository.save(booking);

      throw new ConflictException(
        `Cannot approve booking due to conflicts. Conflicting bookings: ${conflicts.map((c) => c.id).join(', ')}`,
      );
    }

    booking.bookingStatus = BookingStatus.APPROVED;
    booking.approverId = approverId;
    booking.approvalReason = approvalReason;
    booking.approvedAt = new Date();
    booking.hasConflicts = false;
    booking.updatedBy = approverId;

    const saved = await this.resourceBookingRepository.save(booking);

    this.logger.log(`Approved booking: ${id} by user ${approverId}`);

    return saved;
  }

  /**
   * Reject booking
   */
  async rejectBooking(
    id: number,
    approverId: number,
    rejectionReason: string,
  ): Promise<ResourceBooking> {
    const booking = await this.resourceBookingRepository.findById(id);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    if (booking.bookingStatus !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be rejected');
    }

    booking.bookingStatus = BookingStatus.REJECTED;
    booking.approverId = approverId;
    booking.approvalReason = rejectionReason;
    booking.approvedAt = new Date();
    booking.updatedBy = approverId;

    const saved = await this.resourceBookingRepository.save(booking);

    this.logger.log(`Rejected booking: ${id} by user ${approverId}`);

    return saved;
  }

  /**
   * Get bookings for resource
   */
  async getBookingsForResource(
    resourceId: number,
    startDate?: Date,
    endDate?: Date,
    includeCancelled = false,
  ): Promise<ResourceBooking[]> {
    return this.resourceBookingRepository.findByResource(
      resourceId,
      startDate,
      endDate,
      includeCancelled,
    );
  }

  /**
   * Get bookings for user
   */
  async getBookingsForUser(
    userId: number,
    startDate?: Date,
    endDate?: Date,
    organizationId?: number,
  ): Promise<ResourceBooking[]> {
    return this.resourceBookingRepository.findByUser(userId, startDate, endDate, organizationId);
  }

  /**
   * Get bookings in date range
   */
  async getBookingsInRange(
    startTime: Date,
    endTime: Date,
    filters?: {
      resourceId?: number;
      organizationId?: number;
      status?: BookingStatus[];
    },
  ): Promise<ResourceBooking[]> {
    return this.resourceBookingRepository.findBookingsInRange(
      startTime,
      endTime,
      filters?.resourceId,
      filters?.organizationId,
      filters?.status,
    );
  }

  /**
   * Get booking statistics
   */
  async getBookingStatistics(
    resourceId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalBookings: number;
    approvedBookings: number;
    cancelledBookings: number;
    totalHours: number;
    averageDuration: number;
  }> {
    return this.resourceBookingRepository.getBookingStatistics(resourceId, startDate, endDate);
  }

  /**
   * Detect and update conflicts for a booking
   */
  async detectConflicts(bookingId: number): Promise<ResourceBooking> {
    const booking = await this.resourceBookingRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    const conflicts = await this.resourceBookingRepository.findConflictingBookings(
      booking.resourceId,
      booking.startTime,
      booking.endTime,
      bookingId,
    );

    booking.hasConflicts = conflicts.length > 0;
    booking.conflictDetails = conflicts.length > 0 ? conflicts.map((c) => c.id) : null;

    return this.resourceBookingRepository.save(booking);
  }
}
