import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InventoryLocation } from '../entities/inventory-location.entity';

/**
 * Inventory Location Repository
 * 
 * Custom repository methods for inventory location queries.
 */
@Injectable()
export class InventoryLocationRepository extends Repository<InventoryLocation> {
  constructor(private dataSource: DataSource) {
    super(InventoryLocation, dataSource.createEntityManager());
  }

  /**
   * Find location by ID
   */
  async findById(id: number, includeItems = false): Promise<InventoryLocation | null> {
    const query = this.createQueryBuilder('location').where('location.id = :id', { id });

    if (includeItems) {
      query.leftJoinAndSelect('location.items', 'items');
    }

    return query.getOne();
  }

  /**
   * Find locations by organization
   */
  async findByOrganization(
    organizationId: number,
    includeInactive = false,
  ): Promise<InventoryLocation[]> {
    const query = this.createQueryBuilder('location')
      .where('location.organizationId = :organizationId', { organizationId })
      .orderBy('location.locationName', 'ASC');

    if (!includeInactive) {
      query.andWhere('location.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  /**
   * Find child locations
   */
  async findChildren(parentLocationId: number): Promise<InventoryLocation[]> {
    return this.createQueryBuilder('location')
      .where('location.parentLocationId = :parentLocationId', { parentLocationId })
      .andWhere('location.isActive = :isActive', { isActive: true })
      .orderBy('location.locationName', 'ASC')
      .getMany();
  }
}
