import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Resource, ResourceType, ResourceStatus } from '../entities/resource.entity';

/**
 * Resource Repository
 * 
 * Custom repository methods for resource queries with optimized queries.
 */
@Injectable()
export class ResourceRepository extends Repository<Resource> {
  constructor(private dataSource: DataSource) {
    super(Resource, dataSource.createEntityManager());
  }

  /**
   * Find resource by ID
   */
  async findById(id: number, includeBookings = false): Promise<Resource | null> {
    const query = this.createQueryBuilder('resource').where('resource.id = :id', { id });

    if (includeBookings) {
      query.leftJoinAndSelect('resource.bookings', 'bookings');
    }

    return query.getOne();
  }

  /**
   * Find resources by type
   */
  async findByType(
    type: ResourceType,
    organizationId?: number,
    includeInactive = false,
  ): Promise<Resource[]> {
    const query = this.createQueryBuilder('resource')
      .where('resource.resourceType = :type', { type })
      .orderBy('resource.resourceName', 'ASC');

    if (organizationId) {
      query.andWhere('resource.organizationId = :organizationId', { organizationId });
    }

    if (!includeInactive) {
      query.andWhere('resource.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  /**
   * Find resources by status
   */
  async findByStatus(
    status: ResourceStatus,
    organizationId?: number,
  ): Promise<Resource[]> {
    const query = this.createQueryBuilder('resource')
      .where('resource.resourceStatus = :status', { status })
      .andWhere('resource.isActive = :isActive', { isActive: true })
      .orderBy('resource.resourceName', 'ASC');

    if (organizationId) {
      query.andWhere('resource.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find resources by category
   */
  async findByCategory(
    category: string,
    organizationId?: number,
  ): Promise<Resource[]> {
    const query = this.createQueryBuilder('resource')
      .where('resource.category = :category', { category })
      .andWhere('resource.isActive = :isActive', { isActive: true })
      .orderBy('resource.resourceName', 'ASC');

    if (organizationId) {
      query.andWhere('resource.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find resources by location
   */
  async findByLocation(
    locationId: number,
    organizationId?: number,
  ): Promise<Resource[]> {
    const query = this.createQueryBuilder('resource')
      .where('resource.locationId = :locationId', { locationId })
      .andWhere('resource.isActive = :isActive', { isActive: true })
      .orderBy('resource.resourceName', 'ASC');

    if (organizationId) {
      query.andWhere('resource.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find available resources (raw SQL for performance)
   */
  async findAvailableResources(
    startTime: Date,
    endTime: Date,
    resourceType?: ResourceType,
    organizationId?: number,
    minCapacity?: number,
  ): Promise<Resource[]> {
    let query = `
      SELECT DISTINCT r.*
      FROM resources r
      WHERE r.is_active = true
        AND r.resource_status = 'AVAILABLE'
        AND (
          r.id NOT IN (
            SELECT rb.resource_id
            FROM resource_bookings rb
            WHERE rb.booking_status IN ('APPROVED', 'CONFIRMED', 'PENDING')
              AND rb.start_time < $2
              AND rb.end_time > $1
          )
        )
    `;

    const params: any[] = [startTime, endTime];

    if (resourceType) {
      query += ` AND r.resource_type = $${params.length + 1}`;
      params.push(resourceType);
    }

    if (organizationId) {
      query += ` AND r.organization_id = $${params.length + 1}`;
      params.push(organizationId);
    }

    if (minCapacity) {
      query += ` AND (r.capacity IS NULL OR r.capacity >= $${params.length + 1})`;
      params.push(minCapacity);
    }

    query += ` ORDER BY r.resource_name ASC`;

    return this.query(query, params);
  }

  /**
   * Search resources with filters
   */
  async searchResources(
    searchTerm?: string,
    resourceType?: ResourceType,
    category?: string,
    locationId?: number,
    organizationId?: number,
    minCapacity?: number,
    hasFeatures?: string[],
  ): Promise<Resource[]> {
    const query = this.createQueryBuilder('resource')
      .where('resource.isActive = :isActive', { isActive: true })
      .orderBy('resource.resourceName', 'ASC');

    if (searchTerm) {
      query.andWhere(
        `(
          resource.resourceName ILIKE :searchTerm OR
          resource.resourceDescription ILIKE :searchTerm OR
          resource.locationName ILIKE :searchTerm
        )`,
        { searchTerm: `%${searchTerm}%` },
      );
    }

    if (resourceType) {
      query.andWhere('resource.resourceType = :resourceType', { resourceType });
    }

    if (category) {
      query.andWhere('resource.category = :category', { category });
    }

    if (locationId) {
      query.andWhere('resource.locationId = :locationId', { locationId });
    }

    if (organizationId) {
      query.andWhere('resource.organizationId = :organizationId', { organizationId });
    }

    if (minCapacity) {
      query.andWhere('(resource.capacity IS NULL OR resource.capacity >= :minCapacity)', {
        minCapacity,
      });
    }

    if (hasFeatures && hasFeatures.length > 0) {
      query.andWhere('resource.features @> :features', {
        features: JSON.stringify(hasFeatures),
      });
    }

    return query.getMany();
  }
}
