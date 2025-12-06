import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Like } from 'typeorm';
import { Employee, EmploymentStatus } from '../entities/employee.entity';

/**
 * Employee Repository
 * Provides custom queries for employee operations
 */
@Injectable()
export class EmployeeRepository extends Repository<Employee> {
  constructor(private dataSource: DataSource) {
    super(Employee, dataSource.createEntityManager());
  }

  /**
   * Find employee by ID
   */
  async findById(id: number, includeRelations = false): Promise<Employee | null> {
    const query = this.createQueryBuilder('employee').where('employee.id = :id', { id });

    if (includeRelations) {
      query
        .leftJoinAndSelect('employee.organization', 'organization')
        .leftJoinAndSelect('employee.manager', 'manager');
    }

    return query.getOne();
  }

  /**
   * Find employee by email
   */
  async findByEmail(email: string): Promise<Employee | null> {
    return this.findOne({
      where: {
        email: email.trim().toLowerCase(),
      },
      relations: ['organization'],
    });
  }

  /**
   * Find employee by employee number
   */
  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    return this.findOne({
      where: {
        employeeNumber,
      },
      relations: ['organization'],
    });
  }

  /**
   * Find employees by organization ID
   */
  async findByOrganizationId(organizationId: number): Promise<Employee[]> {
    return this.find({
      where: {
        organizationId,
      },
      relations: ['organization'],
      order: {
        lastName: 'ASC',
        firstName: 'ASC',
      },
    });
  }

  /**
   * Find active employees by organization ID
   */
  async findActiveByOrganizationId(organizationId: number): Promise<Employee[]> {
    return this.find({
      where: {
        organizationId,
        active: true,
        employmentStatus: EmploymentStatus.ACTIVE,
      },
      relations: ['organization'],
      order: {
        lastName: 'ASC',
        firstName: 'ASC',
      },
    });
  }

  /**
   * Find employees by department ID
   */
  async findByDepartmentId(departmentId: number): Promise<Employee[]> {
    return this.find({
      where: {
        departmentId,
      },
      relations: ['organization'],
      order: {
        lastName: 'ASC',
        firstName: 'ASC',
      },
    });
  }

  /**
   * Find employees by manager ID
   */
  async findByManagerId(managerId: number): Promise<Employee[]> {
    return this.find({
      where: {
        managerId,
      },
      relations: ['organization'],
      order: {
        lastName: 'ASC',
        firstName: 'ASC',
      },
    });
  }

  /**
   * Find employees by employment status
   */
  async findByEmploymentStatus(
    status: EmploymentStatus,
    organizationId?: number,
  ): Promise<Employee[]> {
    const where: any = {
      employmentStatus: status,
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return this.find({
      where,
      relations: ['organization'],
      order: {
        lastName: 'ASC',
        firstName: 'ASC',
      },
    });
  }

  /**
   * Search employees by name or email
   */
  async search(searchTerm: string, organizationId?: number): Promise<Employee[]> {
    const query = this.createQueryBuilder('employee')
      .leftJoinAndSelect('employee.organization', 'organization')
      .where(
        '(LOWER(employee.firstName) LIKE LOWER(:searchTerm) OR LOWER(employee.lastName) LIKE LOWER(:searchTerm) OR LOWER(employee.email) LIKE LOWER(:searchTerm) OR LOWER(employee.employeeNumber) LIKE LOWER(:searchTerm))',
        { searchTerm: `%${searchTerm.trim()}%` },
      );

    if (organizationId) {
      query.andWhere('employee.organizationId = :organizationId', { organizationId });
    }

    return query
      .orderBy('employee.lastName', 'ASC')
      .addOrderBy('employee.firstName', 'ASC')
      .getMany();
  }

  /**
   * Find employees with pagination
   */
  async findWithPagination(
    page: number,
    limit: number,
    filters?: {
      organizationId?: number;
      departmentId?: number;
      managerId?: number;
      employmentStatus?: EmploymentStatus;
      employeeType?: string;
      active?: boolean;
    },
  ): Promise<{ employees: Employee[]; total: number }> {
    const query = this.createQueryBuilder('employee')
      .leftJoinAndSelect('employee.organization', 'organization');

    if (filters?.organizationId) {
      query.andWhere('employee.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    if (filters?.departmentId) {
      query.andWhere('employee.departmentId = :departmentId', {
        departmentId: filters.departmentId,
      });
    }

    if (filters?.managerId) {
      query.andWhere('employee.managerId = :managerId', { managerId: filters.managerId });
    }

    if (filters?.employmentStatus) {
      query.andWhere('employee.employmentStatus = :employmentStatus', {
        employmentStatus: filters.employmentStatus,
      });
    }

    if (filters?.employeeType) {
      query.andWhere('employee.employeeType = :employeeType', {
        employeeType: filters.employeeType,
      });
    }

    if (filters?.active !== undefined) {
      query.andWhere('employee.active = :active', { active: filters.active });
    }

    query
      .orderBy('employee.lastName', 'ASC')
      .addOrderBy('employee.firstName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [employees, total] = await query.getManyAndCount();

    return { employees, total };
  }

  /**
   * Count employees by organization
   */
  async countByOrganization(organizationId: number): Promise<number> {
    return this.count({
      where: {
        organizationId,
      },
    });
  }

  /**
   * Count active employees by organization
   */
  async countActiveByOrganization(organizationId: number): Promise<number> {
    return this.count({
      where: {
        organizationId,
        active: true,
        employmentStatus: EmploymentStatus.ACTIVE,
      },
    });
  }

  /**
   * Count employees by department
   */
  async countByDepartment(departmentId: number): Promise<number> {
    return this.count({
      where: {
        departmentId,
      },
    });
  }

  /**
   * Count employees by manager
   */
  async countByManager(managerId: number): Promise<number> {
    return this.count({
      where: {
        managerId,
      },
    });
  }

  /**
   * Check if employee number exists
   */
  async employeeNumberExists(employeeNumber: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('employee')
      .where('employee.employeeNumber = :employeeNumber', { employeeNumber });

    if (excludeId) {
      query.andWhere('employee.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('employee')
      .where('LOWER(employee.email) = LOWER(:email)', { email: email.trim().toLowerCase() });

    if (excludeId) {
      query.andWhere('employee.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}

