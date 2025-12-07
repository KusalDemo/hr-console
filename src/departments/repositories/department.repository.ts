import { Injectable } from '@nestjs/common';
import { DataSource, Repository, IsNull } from 'typeorm';
import { Department, DepartmentStatus } from '../entities/department.entity';

/**
 * Department Repository
 * Provides custom queries for department operations
 */
@Injectable()
export class DepartmentRepository extends Repository<Department> {
  constructor(private dataSource: DataSource) {
    super(Department, dataSource.createEntityManager());
  }

  /**
   * Find department by ID
   */
  async findById(id: number, includeRelations = false): Promise<Department | null> {
    const query = this.createQueryBuilder('department').where('department.id = :id', { id });

    if (includeRelations) {
      query
        .leftJoinAndSelect('department.organization', 'organization')
        .leftJoinAndSelect('department.parentDepartment', 'parentDepartment')
        .leftJoinAndSelect('department.manager', 'manager')
        .leftJoinAndSelect('department.teams', 'teams');
    }

    return query.getOne();
  }

  /**
   * Find department by organization and key
   */
  async findByOrganizationAndKey(
    organizationId: number,
    departmentKey: string,
  ): Promise<Department | null> {
    return this.findOne({
      where: {
        organizationId,
        departmentKey,
      },
      relations: ['organization', 'parentDepartment', 'manager'],
    });
  }

  /**
   * Find departments by organization ID
   */
  async findByOrganizationId(organizationId: number): Promise<Department[]> {
    return this.find({
      where: {
        organizationId,
      },
      relations: ['organization', 'parentDepartment', 'manager'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find active departments by organization ID
   */
  async findActiveByOrganizationId(organizationId: number): Promise<Department[]> {
    return this.find({
      where: {
        organizationId,
        status: DepartmentStatus.ACTIVE,
      },
      relations: ['organization', 'parentDepartment', 'manager'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find root departments (departments without parent) by organization
   */
  async findRootByOrganizationId(organizationId: number): Promise<Department[]> {
    return this.find({
      where: {
        organizationId,
        parentDepartmentId: IsNull(),
      },
      relations: ['organization', 'manager'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find child departments of a parent department
   */
  async findChildrenByParentId(parentDepartmentId: number): Promise<Department[]> {
    return this.find({
      where: {
        parentDepartmentId,
      },
      relations: ['organization', 'parentDepartment', 'manager'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find departments by manager ID
   */
  async findByManagerId(managerId: number): Promise<Department[]> {
    return this.find({
      where: {
        managerId,
        status: DepartmentStatus.ACTIVE,
      },
      relations: ['organization', 'parentDepartment'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find departments by status
   */
  async findByStatus(status: DepartmentStatus, organizationId?: number): Promise<Department[]> {
    const where: any = {
      status,
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return this.find({
      where,
      relations: ['organization', 'parentDepartment', 'manager'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find department with hierarchy (parent and children)
   */
  async findWithHierarchy(id: number): Promise<Department | null> {
    return this.createQueryBuilder('department')
      .leftJoinAndSelect('department.organization', 'organization')
      .leftJoinAndSelect('department.parentDepartment', 'parentDepartment')
      .leftJoinAndSelect('department.childDepartments', 'childDepartments')
      .leftJoinAndSelect('department.manager', 'manager')
      .leftJoinAndSelect('department.teams', 'teams')
      .where('department.id = :id', { id })
      .getOne();
  }

  /**
   * Search departments by name
   */
  async search(searchTerm: string, organizationId?: number): Promise<Department[]> {
    const query = this.createQueryBuilder('department')
      .leftJoinAndSelect('department.organization', 'organization')
      .leftJoinAndSelect('department.parentDepartment', 'parentDepartment')
      .leftJoinAndSelect('department.manager', 'manager')
      .where(
        '(LOWER(department.name) LIKE LOWER(:searchTerm) OR LOWER(department.departmentKey) LIKE LOWER(:searchTerm))',
        { searchTerm: `%${searchTerm.trim()}%` },
      );

    if (organizationId) {
      query.andWhere('department.organizationId = :organizationId', { organizationId });
    }

    return query.orderBy('department.name', 'ASC').getMany();
  }

  /**
   * Check if department key exists in organization
   */
  async keyExists(
    organizationId: number,
    departmentKey: string,
    excludeId?: number,
  ): Promise<boolean> {
    const query = this.createQueryBuilder('department')
      .where('department.organizationId = :organizationId', { organizationId })
      .andWhere('department.departmentKey = :departmentKey', { departmentKey });

    if (excludeId) {
      query.andWhere('department.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Count departments by organization
   */
  async countByOrganization(organizationId: number): Promise<number> {
    return this.count({
      where: {
        organizationId,
      },
    });
  }

  /**
   * Count active departments by organization
   */
  async countActiveByOrganization(organizationId: number): Promise<number> {
    return this.count({
      where: {
        organizationId,
        status: DepartmentStatus.ACTIVE,
      },
    });
  }
}
