import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  EquipmentMaintenance,
  MaintenanceType,
  MaintenanceStatus,
} from '../entities/equipment-maintenance.entity';

/**
 * Equipment Maintenance Repository
 * 
 * Custom repository methods for equipment maintenance queries.
 */
@Injectable()
export class EquipmentMaintenanceRepository extends Repository<EquipmentMaintenance> {
  constructor(private dataSource: DataSource) {
    super(EquipmentMaintenance, dataSource.createEntityManager());
  }

  /**
   * Find maintenance by ID
   */
  async findById(id: number, includeEquipment = false): Promise<EquipmentMaintenance | null> {
    const query = this.createQueryBuilder('maintenance').where('maintenance.id = :id', { id });

    if (includeEquipment) {
      query.leftJoinAndSelect('maintenance.equipment', 'equipment');
    }

    return query.getOne();
  }

  /**
   * Find maintenance by equipment
   */
  async findByEquipment(equipmentId: number): Promise<EquipmentMaintenance[]> {
    return this.createQueryBuilder('maintenance')
      .where('maintenance.equipmentId = :equipmentId', { equipmentId })
      .orderBy('maintenance.scheduledDate', 'DESC')
      .getMany();
  }

  /**
   * Find scheduled maintenance
   */
  async findScheduled(
    organizationId?: number,
    beforeDate?: Date,
  ): Promise<EquipmentMaintenance[]> {
    const maintenanceDate = beforeDate || new Date();
    const query = this.createQueryBuilder('maintenance')
      .leftJoin('maintenance.equipment', 'equipment')
      .where('maintenance.maintenanceStatus = :status', { status: MaintenanceStatus.SCHEDULED })
      .andWhere('maintenance.scheduledDate <= :maintenanceDate', { maintenanceDate })
      .orderBy('maintenance.scheduledDate', 'ASC');

    if (organizationId) {
      query.andWhere('equipment.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find maintenance by type
   */
  async findByType(
    maintenanceType: MaintenanceType,
    equipmentId?: number,
  ): Promise<EquipmentMaintenance[]> {
    const query = this.createQueryBuilder('maintenance')
      .where('maintenance.maintenanceType = :maintenanceType', { maintenanceType })
      .orderBy('maintenance.scheduledDate', 'DESC');

    if (equipmentId) {
      query.andWhere('maintenance.equipmentId = :equipmentId', { equipmentId });
    }

    return query.getMany();
  }
}
