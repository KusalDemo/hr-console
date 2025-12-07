import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EmployeeHolidayCalendarAssignment } from '../entities/employee-holiday-calendar-assignment.entity';

/**
 * Employee Holiday Calendar Assignment Repository
 *
 * Custom repository methods for employee calendar assignment queries.
 */
@Injectable()
export class EmployeeHolidayCalendarAssignmentRepository extends Repository<EmployeeHolidayCalendarAssignment> {
  constructor(private dataSource: DataSource) {
    super(EmployeeHolidayCalendarAssignment, dataSource.createEntityManager());
  }

  /**
   * Find assignment by ID
   */
  async findById(id: number): Promise<EmployeeHolidayCalendarAssignment | null> {
    return this.createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.holidayCalendar', 'holidayCalendar')
      .leftJoinAndSelect('assignment.employee', 'employee')
      .where('assignment.id = :id', { id })
      .getOne();
  }

  /**
   * Find assignments by employee
   */
  async findByEmployee(employeeId: number): Promise<EmployeeHolidayCalendarAssignment[]> {
    return this.createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.holidayCalendar', 'holidayCalendar')
      .where('assignment.employeeId = :employeeId', { employeeId })
      .orderBy('assignment.effectiveStartDate', 'DESC')
      .getMany();
  }

  /**
   * Find active assignments by employee
   */
  async findActiveByEmployee(employeeId: number): Promise<EmployeeHolidayCalendarAssignment[]> {
    const now = new Date();
    return this.createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.holidayCalendar', 'holidayCalendar')
      .where('assignment.employeeId = :employeeId', { employeeId })
      .andWhere('assignment.isActive = :isActive', { isActive: true })
      .andWhere('assignment.effectiveStartDate <= :now', { now })
      .andWhere('(assignment.effectiveEndDate IS NULL OR assignment.effectiveEndDate >= :now)', {
        now,
      })
      .orderBy('assignment.effectiveStartDate', 'DESC')
      .getMany();
  }

  /**
   * Find assignments by calendar
   */
  async findByCalendar(holidayCalendarId: number): Promise<EmployeeHolidayCalendarAssignment[]> {
    return this.createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.employee', 'employee')
      .where('assignment.holidayCalendarId = :holidayCalendarId', { holidayCalendarId })
      .orderBy('assignment.employeeId', 'ASC')
      .addOrderBy('assignment.effectiveStartDate', 'DESC')
      .getMany();
  }

  /**
   * Find active assignments by calendar
   */
  async findActiveByCalendar(
    holidayCalendarId: number,
  ): Promise<EmployeeHolidayCalendarAssignment[]> {
    const now = new Date();
    return this.createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.employee', 'employee')
      .where('assignment.holidayCalendarId = :holidayCalendarId', { holidayCalendarId })
      .andWhere('assignment.isActive = :isActive', { isActive: true })
      .andWhere('assignment.effectiveStartDate <= :now', { now })
      .andWhere('(assignment.effectiveEndDate IS NULL OR assignment.effectiveEndDate >= :now)', {
        now,
      })
      .orderBy('assignment.employeeId', 'ASC')
      .getMany();
  }
}
