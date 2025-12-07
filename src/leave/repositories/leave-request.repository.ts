import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { LeaveRequest, LeaveRequestStatus } from '../entities/leave-request.entity';

/**
 * Leave Request Repository
 *
 * Custom repository methods for leave request queries.
 */
@Injectable()
export class LeaveRequestRepository extends Repository<LeaveRequest> {
  constructor(private dataSource: DataSource) {
    super(LeaveRequest, dataSource.createEntityManager());
  }

  /**
   * Find leave request by ID
   */
  async findById(id: number): Promise<LeaveRequest | null> {
    return this.createQueryBuilder('request')
      .leftJoinAndSelect('request.employee', 'employee')
      .where('request.id = :id', { id })
      .getOne();
  }

  /**
   * Find leave requests by employee
   */
  async findByEmployee(employeeId: number, includeCompleted = false): Promise<LeaveRequest[]> {
    const query = this.createQueryBuilder('request')
      .leftJoinAndSelect('request.employee', 'employee')
      .where('request.employeeId = :employeeId', { employeeId })
      .orderBy('request.startDate', 'DESC');

    if (!includeCompleted) {
      query.andWhere('request.status = :status', { status: LeaveRequestStatus.PENDING });
    }

    return query.getMany();
  }

  /**
   * Find leave requests by status
   */
  async findByStatus(status: LeaveRequestStatus, organizationId?: number): Promise<LeaveRequest[]> {
    const query = this.createQueryBuilder('request')
      .leftJoinAndSelect('request.employee', 'employee')
      .where('request.status = :status', { status })
      .orderBy('request.createdAt', 'DESC');

    if (organizationId) {
      query.andWhere('request.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find overlapping leave requests
   */
  async findOverlapping(
    employeeId: number,
    startDate: Date,
    endDate: Date,
    excludeRequestId?: number,
  ): Promise<LeaveRequest[]> {
    const query = this.createQueryBuilder('request')
      .where('request.employeeId = :employeeId', { employeeId })
      .andWhere('request.status != :cancelled', { cancelled: LeaveRequestStatus.CANCELLED })
      .andWhere(
        `(
          (request.startDate <= :startDate AND request.endDate >= :startDate) OR
          (request.startDate <= :endDate AND request.endDate >= :endDate) OR
          (request.startDate >= :startDate AND request.endDate <= :endDate)
        )`,
        { startDate, endDate },
      );

    if (excludeRequestId) {
      query.andWhere('request.id != :excludeRequestId', { excludeRequestId });
    }

    return query.getMany();
  }
}
