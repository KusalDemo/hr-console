import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';

/**
 * Permission Repository
 * Provides custom queries for permission operations
 */
@Injectable()
export class PermissionRepository extends Repository<Permission> {
  constructor(private dataSource: DataSource) {
    super(Permission, dataSource.createEntityManager());
  }

  /**
   * Find permission by ID
   */
  async findById(id: number): Promise<Permission | null> {
    return this.findOne({
      where: { id },
    });
  }

  /**
   * Find permission by key
   */
  async findByKey(permissionKey: string): Promise<Permission | null> {
    return this.findOne({
      where: {
        permissionKey: permissionKey.toLowerCase(),
      },
    });
  }

  /**
   * Find all permissions
   */
  async findAll(): Promise<Permission[]> {
    return this.find({
      order: {
        resourceType: 'ASC',
        action: 'ASC',
      },
    });
  }

  /**
   * Find permissions by resource type
   */
  async findByResourceType(resourceType: string): Promise<Permission[]> {
    return this.find({
      where: {
        resourceType,
      },
      order: {
        action: 'ASC',
      },
    });
  }

  /**
   * Find permissions by action
   */
  async findByAction(action: string): Promise<Permission[]> {
    return this.find({
      where: {
        action,
      },
      order: {
        resourceType: 'ASC',
      },
    });
  }

  /**
   * Find system permissions
   */
  async findSystemPermissions(): Promise<Permission[]> {
    return this.find({
      where: {
        isSystem: true,
      },
      order: {
        resourceType: 'ASC',
        action: 'ASC',
      },
    });
  }

  /**
   * Find custom (non-system) permissions
   */
  async findCustomPermissions(): Promise<Permission[]> {
    return this.find({
      where: {
        isSystem: false,
      },
      order: {
        resourceType: 'ASC',
        action: 'ASC',
      },
    });
  }

  /**
   * Find permissions by multiple keys
   */
  async findByKeys(permissionKeys: string[]): Promise<Permission[]> {
    return this.createQueryBuilder('permission')
      .where('permission.permissionKey IN (:...keys)', {
        keys: permissionKeys.map((k) => k.toLowerCase()),
      })
      .getMany();
  }

  /**
   * Check if permission key exists
   */
  async keyExists(permissionKey: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('permission').where(
      'LOWER(permission.permissionKey) = LOWER(:key)',
      {
        key: permissionKey.toLowerCase(),
      },
    );

    if (excludeId) {
      query.andWhere('permission.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Count permissions
   */
  async countPermissions(): Promise<number> {
    return this.count();
  }

  /**
   * Count system permissions
   */
  async countSystemPermissions(): Promise<number> {
    return this.count({
      where: {
        isSystem: true,
      },
    });
  }

  /**
   * Count custom permissions
   */
  async countCustomPermissions(): Promise<number> {
    return this.count({
      where: {
        isSystem: false,
      },
    });
  }

  /**
   * Get unique resource types
   */
  async getResourceTypes(): Promise<string[]> {
    const results = await this.createQueryBuilder('permission')
      .select('DISTINCT permission.resourceType', 'resourceType')
      .where('permission.resourceType IS NOT NULL')
      .orderBy('permission.resourceType', 'ASC')
      .getRawMany();

    return results.map((r) => r.resourceType).filter((rt) => rt !== null);
  }

  /**
   * Get unique actions
   */
  async getActions(): Promise<string[]> {
    const results = await this.createQueryBuilder('permission')
      .select('DISTINCT permission.action', 'action')
      .where('permission.action IS NOT NULL')
      .orderBy('permission.action', 'ASC')
      .getRawMany();

    return results.map((r) => r.action).filter((a) => a !== null);
  }
}
