import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between } from 'typeorm';
import { ResourceBooking, BookingStatus } from '../entities/resource-booking.entity';

/**
 * Resource Booking Repository
 * 
 * Custom repository methods for resource booking queries with optimized queries.
 */
@Injectable()
export class ResourceBookingRepository extends Repository<ResourceBooking> {
  constructor(private dataSource: DataSource) {
    super(ResourceBooking, dataSource.createEntityManager());
  }

  /**
   * Find booking by ID
   */
  async findById(id: number, includeResource = false): Promise<ResourceBooking | null> {
    const query = this.createQueryBuilder('booking').where('booking.id = :id', { id });

    if (includeResource) {
      query.leftJoinAndSelect('booking.resource', 'resource');
    }

    return query.getOne();
  }

  /**
   * Find bookings by resource
   */
  async findByResource(
    resourceId: number,
    startDate?: Date,
    endDate?: Date,
    includeCancelled = false,
  ): Promise<ResourceBooking[]> {
    const query = this.createQueryBuilder('booking')
      .where('booking.resourceId = :resourceId', { resourceId })
      .orderBy('booking.startTime', 'ASC');

    if (startDate) {
      query.andWhere('booking.startTime >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('booking.endTime <= :endDate', { endDate });
    }

    if (!includeCancelled) {
      query.andWhere('booking.bookingStatus != :cancelled', {
        cancelled: BookingStatus.CANCELLED,
      });
    }

    return query.getMany();
  }

  /**
   * Find bookings by user
   */
  async findByUser(
    userId: number,
    startDate?: Date,
    endDate?: Date,
    organizationId?: number,
  ): Promise<ResourceBooking[]> {
    const query = this.createQueryBuilder('booking')
      .where('booking.bookedById = :userId', { userId })
      .orderBy('booking.startTime', 'ASC');

    if (startDate) {
      query.andWhere('booking.startTime >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('booking.endTime <= :endDate', { endDate });
    }

    if (organizationId) {
      query.andWhere('booking.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find conflicting bookings (raw SQL for performance)
   */
  async findConflictingBookings(
    resourceId: number,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: number,
  ): Promise<ResourceBooking[]> {
    let query = `
      SELECT *
      FROM resource_bookings
      WHERE resource_id = $1
        AND booking_status IN ('APPROVED', 'CONFIRMED', 'PENDING')
        AND start_time < $3
        AND end_time > $2
    `;

    const params: any[] = [resourceId, startTime, endTime];

    if (excludeBookingId) {
      query += ` AND id != $${params.length + 1}`;
      params.push(excludeBookingId);
    }

    query += ` ORDER BY start_time ASC`;

    return this.query(query, params);
  }

  /**
   * Find bookings in date range
   */
  async findBookingsInRange(
    startTime: Date,
    endTime: Date,
    resourceId?: number,
    organizationId?: number,
    status?: BookingStatus[],
  ): Promise<ResourceBooking[]> {
    const query = this.createQueryBuilder('booking')
      .where('booking.startTime < :endTime', { endTime })
      .andWhere('booking.endTime > :startTime', { startTime })
      .orderBy('booking.startTime', 'ASC');

    if (resourceId) {
      query.andWhere('booking.resourceId = :resourceId', { resourceId });
    }

    if (organizationId) {
      query.andWhere('booking.organizationId = :organizationId', { organizationId });
    }

    if (status && status.length > 0) {
      query.andWhere('booking.bookingStatus IN (:...status)', { status });
    }

    return query.getMany();
  }

  /**
   * Find upcoming bookings
   */
  async findUpcomingBookings(
    resourceId?: number,
    organizationId?: number,
    limit = 10,
  ): Promise<ResourceBooking[]> {
    const query = this.createQueryBuilder('booking')
      .where('booking.startTime >= :now', { now: new Date() })
      .andWhere('booking.bookingStatus IN (:...status)', {
        status: [BookingStatus.APPROVED, BookingStatus.CONFIRMED, BookingStatus.PENDING],
      })
      .orderBy('booking.startTime', 'ASC')
      .limit(limit);

    if (resourceId) {
      query.andWhere('booking.resourceId = :resourceId', { resourceId });
    }

    if (organizationId) {
      query.andWhere('booking.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
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
    const result = await this.createQueryBuilder('booking')
      .select('COUNT(*)', 'totalBookings')
      .addSelect(
        `COUNT(CASE WHEN booking_status = 'APPROVED' OR booking_status = 'CONFIRMED' THEN 1 END)`,
        'approvedBookings',
      )
      .addSelect(
        `COUNT(CASE WHEN booking_status = 'CANCELLED' THEN 1 END)`,
        'cancelledBookings',
      )
      .addSelect(
        `SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600)`,
        'totalHours',
      )
      .addSelect(
        `AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600)`,
        'averageDuration',
      )
      .where('booking.resourceId = :resourceId', { resourceId })
      .andWhere('booking.startTime >= :startDate', { startDate })
      .andWhere('booking.endTime <= :endDate', { endDate })
      .getRawOne();

    return {
      totalBookings: parseInt(result.totalBookings) || 0,
      approvedBookings: parseInt(result.approvedBookings) || 0,
      cancelledBookings: parseInt(result.cancelledBookings) || 0,
      totalHours: parseFloat(result.totalHours) || 0,
      averageDuration: parseFloat(result.averageDuration) || 0,
    };
  }
}
