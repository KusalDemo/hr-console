import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EmployeeLeavePolicyAssignment } from '../entities/employee-leave-policy-assignment.entity';

/**
 * Employee Leave Policy Assignment Repository
 * 
 * Custom repository methods for employee policy assignment queries.
 */
@Injectable()
export class EmployeeLeavePolicyAssignmentRepository extends Repository<EmployeeLeavePolicyAssignment> {
  constructor(private dataSource: DataSource) {
    super(EmployeeLeavePolicyAssignment, dataSource.createEntityManager());
  }

  /**
   * Find assignment by ID
   */
  async findById(id: number): Promise<EmployeeLeavePolicyAssignment | null> {
    return this.createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.leavePolicy', 'leavePolicy')
      .leftJoinAndSelect('assignment.employee', 'employee')
      .where('assignment.id = :id', { id })
      .getOne();
  }

  /**
   * Find assignments by employee
   */
  async findByEmployee(employeeId: number): Promise<EmployeeLeavePolicyAssignment[]> {
    return this.createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.leavePolicy', 'leavePolicy')
      .where('assignment.employeeId = :employeeId', { employeeId })
      .orderBy('assignment.priority', 'ASC')
      .addOrderBy('assignment.effectiveStartDate', 'DESC')
      .getMany();
  }

  /**
   * Find active assignments by employee
   */
  async findActiveByEmployee(employeeId: number): Promise<EmployeeLeavePolicyAssignment[]> {
    const now = new Date();
    return this.createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.leavePolicy', 'leavePolicy')
      .where('assignment.employeeId = :employeeId', { employeeId })
      .andWhere('assignment.isActive = :isActive', { isActive: true })
      .andWhere('assignment.effectiveStartDate <= :now', { now })
      .andWhere(
        '(assignment.effectiveEndDate IS NULL OR assignment.effectiveEndDate >= :now)',
        { now },
      )
      .orderBy('assignment.priority', 'ASC')
      .addOrderBy('assignment.effectiveStartDate', 'DESC')
      .getMany();
  }

  /**
   * Find assignments by policy
   */
  async findByPolicy(leavePolicyId: number): Promise<EmployeeLeavePolicyAssignment[]> {
    return this.createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.employee', 'employee')
      .where('assignment.leavePolicyId = :leavePolicyId', { leavePolicyId })
      .orderBy('assignment.employeeId', 'ASC')
      .addOrderBy('assignment.effectiveStartDate', 'DESC')
      .getMany();
  }

  /**
   * Find active assignments by policy
   */
  async findActiveByPolicy(leavePolicyId: number): Promise<EmployeeLeavePolicyAssignment[]> {
    const now = new Date();
    return this.createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.employee', 'employee')
      .where('assignment.leavePolicyId = :leavePolicyId', { leavePolicyId })
      .andWhere('assignment.isActive = :isActive', { isActive: true })
      .andWhere('assignment.effectiveStartDate <= :now', { now })
      .andWhere(
        '(assignment.effectiveEndDate IS NULL OR assignment.effectiveEndDate >= :now)',
        { now },
      )
      .orderBy('assignment.employeeId', 'ASC')
      .getMany();
  }
}
