import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Not } from 'typeorm';
import { Tenant } from '../entities/tenant.entity';

/**
 * Tenant Repository
 * Provides custom queries for tenant operations
 */
@Injectable()
export class TenantRepository extends Repository<Tenant> {
  constructor(private dataSource: DataSource) {
    super(Tenant, dataSource.createEntityManager());
  }

  /**
   * Find tenant by tenant key (case-insensitive)
   * Only returns active tenants by default
   */
  async findByTenantKey(tenantKey: string, includeInactive = false): Promise<Tenant | null> {
    const where: any = {
      tenantKey: tenantKey.trim().toLowerCase(),
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    return this.findOne({
      where,
    });
  }

  /**
   * Find tenant by ID
   * Only returns active tenants by default
   */
  async findById(id: number, includeInactive = false): Promise<Tenant | null> {
    const where: any = { id };

    if (!includeInactive) {
      where.isActive = true;
    }

    return this.findOne({
      where,
    });
  }

  /**
   * Find tenant by ID including inactive tenants
   * Used for tenant management operations
   */
  async findByIdIncludeInactive(id: number): Promise<Tenant | null> {
    return this.findById(id, true);
  }

  /**
   * Find all active tenants
   */
  async findAllActive(): Promise<Tenant[]> {
    return this.find({
      where: {
        isActive: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find all tenants (including inactive)
   * Used for admin operations
   */
  async findAll(): Promise<Tenant[]> {
    return this.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Check if tenant key already exists
   */
  async tenantKeyExists(tenantKey: string, excludeId?: number): Promise<boolean> {
    const where: any = {
      tenantKey: tenantKey.trim().toLowerCase(),
    };

    if (excludeId) {
      where.id = Not(excludeId);
    }

    const count = await this.count({
      where,
    });

    return count > 0;
  }

  /**
   * Activate tenant
   * Sets isActive to true
   */
  async activateTenant(id: number): Promise<void> {
    await this.update(id, {
      isActive: true,
    });
  }

  /**
   * Deactivate tenant
   * Sets isActive to false
   * Note: This is a soft delete - tenant data is preserved
   */
  async deactivateTenant(id: number): Promise<void> {
    await this.update(id, {
      isActive: false,
    });
  }

  /**
   * Update tenant status
   */
  async updateStatus(id: number, isActive: boolean): Promise<void> {
    await this.update(id, {
      isActive,
    });
  }

  /**
   * Find tenants by status
   */
  async findByStatus(isActive: boolean): Promise<Tenant[]> {
    return this.find({
      where: {
        isActive,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Count active tenants
   */
  async countActive(): Promise<number> {
    return this.count({
      where: {
        isActive: true,
      },
    });
  }

  /**
   * Count all tenants
   */
  async countAll(): Promise<number> {
    return this.count();
  }

  /**
   * Find tenants created within a date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Tenant[]> {
    return this.createQueryBuilder('tenant')
      .where('tenant.createdAt >= :startDate', { startDate })
      .andWhere('tenant.createdAt <= :endDate', { endDate })
      .orderBy('tenant.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Find tenants with pagination
   */
  async findWithPagination(
    page: number,
    limit: number,
    includeInactive = false,
  ): Promise<{ tenants: Tenant[]; total: number }> {
    const queryBuilder = this.createQueryBuilder('tenant');

    if (!includeInactive) {
      queryBuilder.where('tenant.isActive = :isActive', { isActive: true });
    }

    queryBuilder
      .orderBy('tenant.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [tenants, total] = await queryBuilder.getManyAndCount();

    return { tenants, total };
  }

  /**
   * Search tenants by name or tenant key
   */
  async search(
    searchTerm: string,
    includeInactive = false,
  ): Promise<Tenant[]> {
    const queryBuilder = this.createQueryBuilder('tenant')
      .where(
        '(LOWER(tenant.name) LIKE LOWER(:searchTerm) OR LOWER(tenant.tenantKey) LIKE LOWER(:searchTerm))',
        { searchTerm: `%${searchTerm.trim()}%` },
      )
      .orderBy('tenant.createdAt', 'DESC');

    if (!includeInactive) {
      queryBuilder.andWhere('tenant.isActive = :isActive', { isActive: true });
    }

    return queryBuilder.getMany();
  }
}

