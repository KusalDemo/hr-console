import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Role } from '../entities/role.entity';

/**
 * Role Repository
 * Provides custom queries for role operations
 */
@Injectable()
export class RoleRepository extends Repository<Role> {
  constructor(private dataSource: DataSource) {
    super(Role, dataSource.createEntityManager());
  }

  /**
   * Find role by ID with permissions
   */
  async findById(id: number, includePermissions = false): Promise<Role | null> {
    const query = this.createQueryBuilder('role')
      .where('role.id = :id', { id });

    if (includePermissions) {
      query
        .leftJoinAndSelect('role.permissions', 'permission')
        .leftJoinAndSelect('role.rolePermissions', 'rolePermission')
        .leftJoinAndSelect('rolePermission.permission', 'rolePermissionPermission');
    }

    return query.getOne();
  }

  /**
   * Find role by name
   */
  async findByName(name: string, includePermissions = false): Promise<Role | null> {
    const query = this.createQueryBuilder('role')
      .where('LOWER(role.name) = LOWER(:name)', { name });

    if (includePermissions) {
      query
        .leftJoinAndSelect('role.permissions', 'permission')
        .leftJoinAndSelect('role.rolePermissions', 'rolePermission')
        .leftJoinAndSelect('rolePermission.permission', 'rolePermissionPermission');
    }

    return query.getOne();
  }

  /**
   * Find all roles
   */
  async findAll(includePermissions = false): Promise<Role[]> {
    const query = this.createQueryBuilder('role');

    if (includePermissions) {
      query
        .leftJoinAndSelect('role.permissions', 'permission')
        .leftJoinAndSelect('role.rolePermissions', 'rolePermission')
        .leftJoinAndSelect('rolePermission.permission', 'rolePermissionPermission');
    }

    return query.getMany();
  }

  /**
   * Find system roles
   */
  async findSystemRoles(includePermissions = false): Promise<Role[]> {
    const query = this.createQueryBuilder('role')
      .where('role.isSystemRole = :isSystem', { isSystem: true });

    if (includePermissions) {
      query
        .leftJoinAndSelect('role.permissions', 'permission')
        .leftJoinAndSelect('role.rolePermissions', 'rolePermission')
        .leftJoinAndSelect('rolePermission.permission', 'rolePermissionPermission');
    }

    return query.getMany();
  }

  /**
   * Find custom (non-system) roles
   */
  async findCustomRoles(includePermissions = false): Promise<Role[]> {
    const query = this.createQueryBuilder('role')
      .where('role.isSystemRole = :isSystem', { isSystem: false });

    if (includePermissions) {
      query
        .leftJoinAndSelect('role.permissions', 'permission')
        .leftJoinAndSelect('role.rolePermissions', 'rolePermission')
        .leftJoinAndSelect('rolePermission.permission', 'rolePermissionPermission');
    }

    return query.getMany();
  }

  /**
   * Find root roles (roles without parent)
   */
  async findRootRoles(includePermissions = false): Promise<Role[]> {
    const query = this.createQueryBuilder('role')
      .where('role.parentRoleId IS NULL');

    if (includePermissions) {
      query
        .leftJoinAndSelect('role.permissions', 'permission')
        .leftJoinAndSelect('role.rolePermissions', 'rolePermission')
        .leftJoinAndSelect('rolePermission.permission', 'rolePermissionPermission');
    }

    return query.getMany();
  }

  /**
   * Find child roles of a parent role
   */
  async findChildRoles(parentRoleId: number, includePermissions = false): Promise<Role[]> {
    const query = this.createQueryBuilder('role')
      .where('role.parentRoleId = :parentRoleId', { parentRoleId });

    if (includePermissions) {
      query
        .leftJoinAndSelect('role.permissions', 'permission')
        .leftJoinAndSelect('role.rolePermissions', 'rolePermission')
        .leftJoinAndSelect('rolePermission.permission', 'rolePermissionPermission');
    }

    return query.getMany();
  }

  /**
   * Find role with parent and children
   */
  async findWithHierarchy(id: number): Promise<Role | null> {
    return this.createQueryBuilder('role')
      .leftJoinAndSelect('role.parentRole', 'parentRole')
      .leftJoinAndSelect('role.childRoles', 'childRoles')
      .where('role.id = :id', { id })
      .getOne();
  }

  /**
   * Check if role name exists
   */
  async nameExists(name: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('role')
      .where('LOWER(role.name) = LOWER(:name)', { name });

    if (excludeId) {
      query.andWhere('role.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Count roles
   */
  async countRoles(): Promise<number> {
    return this.count();
  }

  /**
   * Count system roles
   */
  async countSystemRoles(): Promise<number> {
    return this.count({
      where: {
        isSystemRole: true,
      },
    });
  }

  /**
   * Count custom roles
   */
  async countCustomRoles(): Promise<number> {
    return this.count({
      where: {
        isSystemRole: false,
      },
    });
  }
}

