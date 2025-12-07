import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EquipmentAssignment, AssignmentStatus } from '../entities/equipment-assignment.entity';

/**
 * Equipment Assignment Repository
 * 
 * Custom repository methods for equipment assignment queries.
 */
@Injectable()
export class EquipmentAssignmentRepository extends Repository<EquipmentAssignment> {
  constructor(private dataSource: DataSource) {
    super(EquipmentAssignment, dataSource.createEntityManager());
  }

  /**
   * Find assignment by ID
   */
  async findById(id: number, includeEquipment = false): Promise<EquipmentAssignment | null> {
    const query = this.createQueryBuilder('assignment').where('assignment.id = :id', { id });

    if (includeEquipment) {
      query.leftJoinAndSelect('assignment.equipment', 'equipment');
      query.leftJoinAndSelect('assignment.employee', 'employee');
    }

    return query.getOne();
  }

  /**
   * Find active assignments for equipment
   */
  async findActiveByEquipment(equipmentId: number): Promise<EquipmentAssignment | null> {
    return this.createQueryBuilder('assignment')
      .where('assignment.equipmentId = :equipmentId', { equipmentId })
      .andWhere('assignment.assignmentStatus = :status', { status: AssignmentStatus.ACTIVE })
      .orderBy('assignment.assignedDate', 'DESC')
      .limit(1)
      .getOne();
  }

  /**
   * Find assignments by employee
   */
  async findByEmployee(
    employeeId: number,
    includeReturned = false,
  ): Promise<EquipmentAssignment[]> {
    const query = this.createQueryBuilder('assignment')
      .where('assignment.employeeId = :employeeId', { employeeId })
      .orderBy('assignment.assignedDate', 'DESC');

    if (!includeReturned) {
      query.andWhere('assignment.assignmentStatus = :status', { status: AssignmentStatus.ACTIVE });
    }

    return query.getMany();
  }

  /**
   * Find assignments by equipment
   */
  async findByEquipment(equipmentId: number): Promise<EquipmentAssignment[]> {
    return this.createQueryBuilder('assignment')
      .where('assignment.equipmentId = :equipmentId', { equipmentId })
      .orderBy('assignment.assignedDate', 'DESC')
      .getMany();
  }
}
