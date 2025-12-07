import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Equipment, EquipmentStatus } from '../entities/equipment.entity';

/**
 * Equipment Repository
 * 
 * Custom repository methods for equipment queries.
 */
@Injectable()
export class EquipmentRepository extends Repository<Equipment> {
  constructor(private dataSource: DataSource) {
    super(Equipment, dataSource.createEntityManager());
  }

  /**
   * Find equipment by ID
   */
  async findById(
    id: number,
    includeAssignments = false,
    includeMaintenance = false,
  ): Promise<Equipment | null> {
    const query = this.createQueryBuilder('equipment').where('equipment.id = :id', { id });

    if (includeAssignments) {
      query.leftJoinAndSelect('equipment.assignments', 'assignments');
    }

    if (includeMaintenance) {
      query.leftJoinAndSelect('equipment.maintenanceHistory', 'maintenanceHistory');
    }

    return query.getOne();
  }

  /**
   * Find equipment by asset tag
   */
  async findByAssetTag(assetTag: string): Promise<Equipment | null> {
    return this.createQueryBuilder('equipment')
      .where('equipment.assetTag = :assetTag', { assetTag })
      .getOne();
  }

  /**
   * Find equipment by status
   */
  async findByStatus(
    status: EquipmentStatus,
    organizationId?: number,
  ): Promise<Equipment[]> {
    const query = this.createQueryBuilder('equipment')
      .where('equipment.equipmentStatus = :status', { status })
      .andWhere('equipment.isActive = :isActive', { isActive: true })
      .orderBy('equipment.equipmentName', 'ASC');

    if (organizationId) {
      query.andWhere('equipment.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find equipment by category
   */
  async findByCategory(
    category: string,
    organizationId?: number,
  ): Promise<Equipment[]> {
    const query = this.createQueryBuilder('equipment')
      .where('equipment.category = :category', { category })
      .andWhere('equipment.isActive = :isActive', { isActive: true })
      .orderBy('equipment.equipmentName', 'ASC');

    if (organizationId) {
      query.andWhere('equipment.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find equipment needing maintenance
   */
  async findNeedingMaintenance(
    organizationId?: number,
    beforeDate?: Date,
  ): Promise<Equipment[]> {
    const maintenanceDate = beforeDate || new Date();
    const query = this.createQueryBuilder('equipment')
      .where('equipment.isActive = :isActive', { isActive: true })
      .andWhere('equipment.equipmentStatus != :retired', { retired: EquipmentStatus.RETIRED })
      .andWhere(
        '(equipment.nextMaintenanceDate IS NOT NULL AND equipment.nextMaintenanceDate <= :maintenanceDate)',
        { maintenanceDate },
      )
      .orderBy('equipment.nextMaintenanceDate', 'ASC');

    if (organizationId) {
      query.andWhere('equipment.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find equipment with expired warranty
   */
  async findWithExpiredWarranty(
    organizationId?: number,
  ): Promise<Equipment[]> {
    const query = this.createQueryBuilder('equipment')
      .where('equipment.isActive = :isActive', { isActive: true })
      .andWhere('equipment.warrantyEndDate IS NOT NULL')
      .andWhere('equipment.warrantyEndDate < :today', { today: new Date() })
      .orderBy('equipment.warrantyEndDate', 'ASC');

    if (organizationId) {
      query.andWhere('equipment.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Search equipment
   */
  async searchEquipment(
    searchTerm?: string,
    category?: string,
    equipmentType?: string,
    status?: EquipmentStatus,
    organizationId?: number,
  ): Promise<Equipment[]> {
    const query = this.createQueryBuilder('equipment')
      .where('equipment.isActive = :isActive', { isActive: true })
      .orderBy('equipment.equipmentName', 'ASC');

    if (searchTerm) {
      query.andWhere(
        `(
          equipment.equipmentName ILIKE :searchTerm OR
          equipment.assetTag ILIKE :searchTerm OR
          equipment.serialNumber ILIKE :searchTerm OR
          equipment.modelNumber ILIKE :searchTerm
        )`,
        { searchTerm: `%${searchTerm}%` },
      );
    }

    if (category) {
      query.andWhere('equipment.category = :category', { category });
    }

    if (equipmentType) {
      query.andWhere('equipment.equipmentType = :equipmentType', { equipmentType });
    }

    if (status) {
      query.andWhere('equipment.equipmentStatus = :status', { status });
    }

    if (organizationId) {
      query.andWhere('equipment.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find bookable equipment
   */
  async findBookable(organizationId?: number): Promise<Equipment[]> {
    const query = this.createQueryBuilder('equipment')
      .where('equipment.isBookable = :isBookable', { isBookable: true })
      .andWhere('equipment.isActive = :isActive', { isActive: true })
      .andWhere('equipment.equipmentStatus = :status', { status: EquipmentStatus.AVAILABLE })
      .orderBy('equipment.equipmentName', 'ASC');

    if (organizationId) {
      query.andWhere('equipment.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }
}
