import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between } from 'typeorm';
import { EquipmentBooking, BookingStatus } from '../entities/equipment-booking.entity';

/**
 * Equipment Booking Repository
 *
 * Custom repository methods for equipment booking queries.
 */
@Injectable()
export class EquipmentBookingRepository extends Repository<EquipmentBooking> {
  constructor(private dataSource: DataSource) {
    super(EquipmentBooking, dataSource.createEntityManager());
  }

  /**
   * Find booking by ID
   */
  async findById(id: number): Promise<EquipmentBooking | null> {
    return this.createQueryBuilder('booking')
      .leftJoinAndSelect('booking.equipment', 'equipment')
      .leftJoinAndSelect('booking.employee', 'employee')
      .leftJoinAndSelect('booking.workflowInstance', 'workflowInstance')
      .where('booking.id = :id', { id })
      .getOne();
  }

  /**
   * Find bookings by equipment
   */
  async findByEquipment(
    equipmentId: number,
    includeCompleted = false,
  ): Promise<EquipmentBooking[]> {
    const query = this.createQueryBuilder('booking')
      .leftJoinAndSelect('booking.employee', 'employee')
      .leftJoinAndSelect('booking.workflowInstance', 'workflowInstance')
      .where('booking.equipmentId = :equipmentId', { equipmentId })
      .orderBy('booking.startDate', 'DESC');

    if (!includeCompleted) {
      query.andWhere('booking.bookingStatus != :completed', {
        completed: BookingStatus.COMPLETED,
      });
    }

    return query.getMany();
  }

  /**
   * Find bookings by employee
   */
  async findByEmployee(employeeId: number, includeCompleted = false): Promise<EquipmentBooking[]> {
    const query = this.createQueryBuilder('booking')
      .leftJoinAndSelect('booking.equipment', 'equipment')
      .leftJoinAndSelect('booking.workflowInstance', 'workflowInstance')
      .where('booking.employeeId = :employeeId', { employeeId })
      .orderBy('booking.startDate', 'DESC');

    if (!includeCompleted) {
      query.andWhere('booking.bookingStatus != :completed', {
        completed: BookingStatus.COMPLETED,
      });
    }

    return query.getMany();
  }

  /**
   * Find active bookings for equipment in date range
   * Used for conflict detection
   */
  async findActiveBookingsInRange(
    equipmentId: number,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: number,
  ): Promise<EquipmentBooking[]> {
    const query = this.createQueryBuilder('booking')
      .leftJoinAndSelect('booking.employee', 'employee')
      .where('booking.equipmentId = :equipmentId', { equipmentId })
      .andWhere('booking.bookingStatus IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.ACTIVE],
      })
      .andWhere(
        `(
          (booking.startDate <= :startDate AND booking.endDate >= :startDate) OR
          (booking.startDate <= :endDate AND booking.endDate >= :endDate) OR
          (booking.startDate >= :startDate AND booking.endDate <= :endDate)
        )`,
        { startDate, endDate },
      )
      .orderBy('booking.startDate', 'ASC');

    if (excludeBookingId) {
      query.andWhere('booking.id != :excludeBookingId', { excludeBookingId });
    }

    return query.getMany();
  }

  /**
   * Find bookings by status
   */
  async findByStatus(status: BookingStatus, organizationId?: number): Promise<EquipmentBooking[]> {
    const query = this.createQueryBuilder('booking')
      .leftJoinAndSelect('booking.equipment', 'equipment')
      .leftJoinAndSelect('booking.employee', 'employee')
      .where('booking.bookingStatus = :status', { status })
      .orderBy('booking.startDate', 'ASC');

    if (organizationId) {
      query.andWhere('booking.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find pending bookings requiring approval
   */
  async findPendingApprovals(
    organizationId?: number,
    approverId?: number,
  ): Promise<EquipmentBooking[]> {
    const query = this.createQueryBuilder('booking')
      .leftJoinAndSelect('booking.equipment', 'equipment')
      .leftJoinAndSelect('booking.employee', 'employee')
      .leftJoinAndSelect('booking.workflowInstance', 'workflowInstance')
      .where('booking.bookingStatus = :status', { status: BookingStatus.PENDING })
      .orderBy('booking.createdAt', 'ASC');

    if (organizationId) {
      query.andWhere('booking.organizationId = :organizationId', { organizationId });
    }

    // If approverId is provided, filter by workflow approvals
    if (approverId) {
      query
        .leftJoin('workflowInstance.approvals', 'approvals')
        .andWhere('approvals.approverId = :approverId', { approverId })
        .andWhere('approvals.status = :approvalStatus', {
          approvalStatus: 'PENDING',
        });
    }

    return query.getMany();
  }

  /**
   * Find bookings that need to be activated (approved bookings where start date has passed)
   */
  async findBookingsToActivate(beforeDate?: Date): Promise<EquipmentBooking[]> {
    const date = beforeDate || new Date();
    return this.createQueryBuilder('booking')
      .leftJoinAndSelect('booking.equipment', 'equipment')
      .leftJoinAndSelect('booking.employee', 'employee')
      .where('booking.bookingStatus = :status', { status: BookingStatus.APPROVED })
      .andWhere('booking.startDate <= :date', { date })
      .getMany();
  }

  /**
   * Find bookings that need to be completed (active bookings where end date has passed)
   */
  async findBookingsToComplete(beforeDate?: Date): Promise<EquipmentBooking[]> {
    const date = beforeDate || new Date();
    return this.createQueryBuilder('booking')
      .leftJoinAndSelect('booking.equipment', 'equipment')
      .leftJoinAndSelect('booking.employee', 'employee')
      .where('booking.bookingStatus = :status', { status: BookingStatus.ACTIVE })
      .andWhere('booking.endDate <= :date', { date })
      .getMany();
  }

  /**
   * Get booking statistics for equipment
   */
  async getBookingStatistics(
    equipmentId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    totalUsageHours: number;
    averageBookingDuration: number;
  }> {
    const query = this.createQueryBuilder('booking').where('booking.equipmentId = :equipmentId', {
      equipmentId,
    });

    if (startDate) {
      query.andWhere('booking.startDate >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('booking.endDate <= :endDate', { endDate });
    }

    const bookings = await query.getMany();

    const totalBookings = bookings.length;
    const activeBookings = bookings.filter((b) => b.bookingStatus === BookingStatus.ACTIVE).length;
    const completedBookings = bookings.filter(
      (b) => b.bookingStatus === BookingStatus.COMPLETED,
    ).length;

    const completedWithUsage = bookings.filter(
      (b) => b.bookingStatus === BookingStatus.COMPLETED && b.usageHours,
    );
    const totalUsageHours =
      completedWithUsage.reduce((sum, b) => sum + (b.usageHours || 0), 0) || 0;
    const averageBookingDuration =
      completedWithUsage.length > 0 ? totalUsageHours / completedWithUsage.length : 0;

    return {
      totalBookings,
      activeBookings,
      completedBookings,
      totalUsageHours,
      averageBookingDuration,
    };
  }

  /**
   * Get concurrent bookings count for equipment at a specific time
   */
  async getConcurrentBookingsCount(
    equipmentId: number,
    date: Date,
    excludeBookingId?: number,
  ): Promise<number> {
    const query = this.createQueryBuilder('booking')
      .where('booking.equipmentId = :equipmentId', { equipmentId })
      .andWhere('booking.bookingStatus IN (:...statuses)', {
        statuses: [BookingStatus.APPROVED, BookingStatus.ACTIVE],
      })
      .andWhere('booking.startDate <= :date', { date })
      .andWhere('booking.endDate >= :date', { date });

    if (excludeBookingId) {
      query.andWhere('booking.id != :excludeBookingId', { excludeBookingId });
    }

    return query.getCount();
  }
}
