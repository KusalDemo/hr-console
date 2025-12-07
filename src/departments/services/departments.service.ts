import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DepartmentRepository } from '../repositories/department.repository';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { EmployeeRepository } from '../../employees/repositories/employee.repository';
import { Department, DepartmentType, DepartmentStatus } from '../entities/department.entity';
import { CreateDepartmentDto, UpdateDepartmentDto } from '../dto';

/**
 * Departments Service
 *
 * Provides business logic for department operations:
 * - Create department
 * - Get department by ID
 * - Get departments (with filters)
 * - Update department
 * - Delete department (soft delete)
 * - Department hierarchy management
 * - Search departments
 *
 * This service handles all department management operations
 * including validation, hierarchy validation, and organization relationships.
 */
@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  /**
   * Create a new department
   *
   * @param createDto - Department creation data
   * @param createdBy - User ID who created the department (optional)
   * @returns Created department information
   */
  async createDepartment(createDto: CreateDepartmentDto, createdBy?: number): Promise<Department> {
    this.logger.log(`Creating department: ${createDto.name}`);

    // Validate organization exists
    const organization = await this.organizationRepository.findById(createDto.organizationId);
    if (!organization) {
      throw new NotFoundException('Organization', createDto.organizationId.toString());
    }

    // Check if department key already exists in organization
    const keyExists = await this.departmentRepository.keyExists(
      createDto.organizationId,
      createDto.departmentKey,
    );
    if (keyExists) {
      throw new ConflictException(
        `Department with key ${createDto.departmentKey} already exists in organization`,
      );
    }

    // Validate parent department if provided
    if (createDto.parentDepartmentId) {
      const parentDepartment = await this.departmentRepository.findById(
        createDto.parentDepartmentId,
      );
      if (!parentDepartment) {
        throw new NotFoundException('Parent Department', createDto.parentDepartmentId.toString());
      }
      if (parentDepartment.organizationId !== createDto.organizationId) {
        throw new BadRequestException('Parent department must belong to the same organization');
      }
      // Prevent circular reference
      if (await this.wouldCreateCircularReference(createDto.parentDepartmentId, null)) {
        throw new BadRequestException('Cannot create circular reference in department hierarchy');
      }
    }

    // Validate manager if provided
    if (createDto.managerId) {
      const manager = await this.employeeRepository.findById(createDto.managerId);
      if (!manager) {
        throw new NotFoundException('Manager', createDto.managerId.toString());
      }
      if (manager.organizationId !== createDto.organizationId) {
        throw new BadRequestException('Manager must belong to the same organization');
      }
    }

    try {
      // Create department entity
      const department = this.departmentRepository.create({
        organizationId: createDto.organizationId,
        departmentKey: createDto.departmentKey,
        name: createDto.name,
        displayName: createDto.displayName || null,
        description: createDto.description || null,
        parentDepartmentId: createDto.parentDepartmentId || null,
        departmentType: createDto.departmentType || DepartmentType.STANDARD,
        costCenterCode: createDto.costCenterCode || null,
        status: createDto.status || DepartmentStatus.ACTIVE,
        managerId: createDto.managerId || null,
        headcountLimit: createDto.headcountLimit || null,
        budgetAllocated: createDto.budgetAllocated || null,
        budgetPeriod: createDto.budgetPeriod || null,
        location: createDto.location || null,
        createdBy: createdBy || null,
        updatedBy: createdBy || null,
      });

      // Save department
      const savedDepartment = await this.departmentRepository.save(department);

      this.logger.log(`Successfully created department ID: ${savedDepartment.id}`);

      // Load with relations
      return (await this.departmentRepository.findById(savedDepartment.id, true)) as Department;
    } catch (error) {
      this.logger.error(
        `Failed to create department: ${createDto.name}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to create department');
    }
  }

  /**
   * Get department by ID
   *
   * @param id - Department ID
   * @returns Department information
   */
  async getDepartmentById(id: number): Promise<Department> {
    const department = await this.departmentRepository.findById(id, true);
    if (!department) {
      throw new NotFoundException('Department', id.toString());
    }

    return department;
  }

  /**
   * Get department with hierarchy
   *
   * @param id - Department ID
   * @returns Department with parent and children
   */
  async getDepartmentWithHierarchy(id: number): Promise<Department> {
    const department = await this.departmentRepository.findWithHierarchy(id);
    if (!department) {
      throw new NotFoundException('Department', id.toString());
    }

    return department;
  }

  /**
   * Get departments by organization
   *
   * @param organizationId - Organization ID
   * @param activeOnly - Only return active departments
   * @returns Array of departments
   */
  async getDepartmentsByOrganization(
    organizationId: number,
    activeOnly: boolean = false,
  ): Promise<Department[]> {
    return activeOnly
      ? await this.departmentRepository.findActiveByOrganizationId(organizationId)
      : await this.departmentRepository.findByOrganizationId(organizationId);
  }

  /**
   * Get root departments (departments without parent)
   *
   * @param organizationId - Organization ID
   * @returns Array of root departments
   */
  async getRootDepartments(organizationId: number): Promise<Department[]> {
    return this.departmentRepository.findRootByOrganizationId(organizationId);
  }

  /**
   * Get child departments
   *
   * @param parentDepartmentId - Parent department ID
   * @returns Array of child departments
   */
  async getChildDepartments(parentDepartmentId: number): Promise<Department[]> {
    return this.departmentRepository.findChildrenByParentId(parentDepartmentId);
  }

  /**
   * Get department hierarchy (all descendants)
   *
   * @param departmentId - Department ID
   * @returns Array of departments including the department and all descendants
   */
  async getDepartmentHierarchy(departmentId: number): Promise<Department[]> {
    const department = await this.departmentRepository.findById(departmentId);
    if (!department) {
      throw new NotFoundException('Department', departmentId.toString());
    }

    const hierarchy: Department[] = [department];
    const descendants = await department.getDescendants();
    hierarchy.push(...descendants);

    return hierarchy;
  }

  /**
   * Update department
   *
   * @param id - Department ID
   * @param updateDto - Department update data
   * @param updatedBy - User ID who updated the department (optional)
   * @returns Updated department information
   */
  async updateDepartment(
    id: number,
    updateDto: UpdateDepartmentDto,
    updatedBy?: number,
  ): Promise<Department> {
    this.logger.log(`Updating department ID: ${id}`);

    // Find department
    const department = await this.departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundException('Department', id.toString());
    }

    // Check if department key is being changed and if it already exists
    if (updateDto.departmentKey && updateDto.departmentKey !== department.departmentKey) {
      const keyExists = await this.departmentRepository.keyExists(
        department.organizationId,
        updateDto.departmentKey,
        id,
      );
      if (keyExists) {
        throw new ConflictException(
          `Department with key ${updateDto.departmentKey} already exists in organization`,
        );
      }
    }

    // Validate parent department if being changed
    if (
      updateDto.parentDepartmentId !== undefined &&
      updateDto.parentDepartmentId !== department.parentDepartmentId
    ) {
      if (updateDto.parentDepartmentId !== null) {
        const parentDepartment = await this.departmentRepository.findById(
          updateDto.parentDepartmentId,
        );
        if (!parentDepartment) {
          throw new NotFoundException('Parent Department', updateDto.parentDepartmentId.toString());
        }
        if (parentDepartment.organizationId !== department.organizationId) {
          throw new BadRequestException('Parent department must belong to the same organization');
        }
        // Prevent circular reference
        if (await this.wouldCreateCircularReference(updateDto.parentDepartmentId, id)) {
          throw new BadRequestException('Cannot create circular reference in department hierarchy');
        }
      }
    }

    // Validate manager if being changed
    if (updateDto.managerId !== undefined && updateDto.managerId !== department.managerId) {
      if (updateDto.managerId !== null) {
        const manager = await this.employeeRepository.findById(updateDto.managerId);
        if (!manager) {
          throw new NotFoundException('Manager', updateDto.managerId.toString());
        }
        if (manager.organizationId !== department.organizationId) {
          throw new BadRequestException('Manager must belong to the same organization');
        }
      }
    }

    try {
      // Prepare update data
      const updateData: Partial<Department> = {
        updatedBy: updatedBy || null,
      };

      if (updateDto.departmentKey !== undefined) {
        updateData.departmentKey = updateDto.departmentKey;
      }
      if (updateDto.name !== undefined) {
        updateData.name = updateDto.name;
      }
      if (updateDto.displayName !== undefined) {
        updateData.displayName = updateDto.displayName || null;
      }
      if (updateDto.description !== undefined) {
        updateData.description = updateDto.description || null;
      }
      if (updateDto.parentDepartmentId !== undefined) {
        updateData.parentDepartmentId = updateDto.parentDepartmentId || null;
      }
      if (updateDto.departmentType !== undefined) {
        updateData.departmentType = updateDto.departmentType;
      }
      if (updateDto.costCenterCode !== undefined) {
        updateData.costCenterCode = updateDto.costCenterCode || null;
      }
      if (updateDto.status !== undefined) {
        updateData.status = updateDto.status;
      }
      if (updateDto.managerId !== undefined) {
        updateData.managerId = updateDto.managerId || null;
      }
      if (updateDto.headcountLimit !== undefined) {
        updateData.headcountLimit = updateDto.headcountLimit || null;
      }
      if (updateDto.budgetAllocated !== undefined) {
        updateData.budgetAllocated = updateDto.budgetAllocated || null;
      }
      if (updateDto.budgetPeriod !== undefined) {
        updateData.budgetPeriod = updateDto.budgetPeriod || null;
      }
      if (updateDto.location !== undefined) {
        updateData.location = updateDto.location || null;
      }

      // Update department
      await this.departmentRepository.update(id, updateData);

      // Fetch updated department with relations
      const updatedDepartment = await this.departmentRepository.findById(id, true);
      if (!updatedDepartment) {
        throw new NotFoundException('Department', id.toString());
      }

      this.logger.log(`Successfully updated department ID: ${id}`);

      return updatedDepartment;
    } catch (error) {
      this.logger.error(
        `Failed to update department ID: ${id}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to update department');
    }
  }

  /**
   * Delete department (soft delete)
   *
   * @param id - Department ID
   * @param deletedBy - User ID who deleted the department (optional)
   * @returns Deleted department information
   */
  async deleteDepartment(id: number, deletedBy?: number): Promise<Department> {
    this.logger.log(`Deleting department ID: ${id}`);

    const department = await this.departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundException('Department', id.toString());
    }

    // Check if department has children
    const hasChildren = await department.hasChildren();
    if (hasChildren) {
      throw new BadRequestException(
        'Cannot delete department with child departments. Please delete or move child departments first.',
      );
    }

    try {
      // Soft delete: set status to ARCHIVED
      await this.departmentRepository.update(id, {
        status: DepartmentStatus.ARCHIVED,
        updatedBy: deletedBy || null,
      });

      // Fetch updated department
      const deletedDepartment = await this.departmentRepository.findById(id, true);
      if (!deletedDepartment) {
        throw new NotFoundException('Department', id.toString());
      }

      this.logger.log(`Successfully deleted department ID: ${id}`);

      return deletedDepartment;
    } catch (error) {
      this.logger.error(
        `Failed to delete department ID: ${id}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to delete department');
    }
  }

  /**
   * Search departments
   *
   * @param searchTerm - Search term (name or key)
   * @param organizationId - Optional organization filter
   * @returns Array of matching departments
   */
  async searchDepartments(searchTerm: string, organizationId?: number): Promise<Department[]> {
    return this.departmentRepository.search(searchTerm, organizationId);
  }

  /**
   * Check if setting a parent would create a circular reference
   *
   * @param newParentId - New parent department ID
   * @param currentDepartmentId - Current department ID (null for new departments)
   * @returns true if circular reference would be created
   */
  private async wouldCreateCircularReference(
    newParentId: number,
    currentDepartmentId: number | null,
  ): Promise<boolean> {
    if (currentDepartmentId === null) {
      // For new departments, check if newParentId is in the ancestors of any potential child
      // This is a simplified check - in practice, we'd need to check all potential children
      return false;
    }

    // Get all descendants of current department
    const currentDepartment = await this.departmentRepository.findById(currentDepartmentId);
    if (!currentDepartment) {
      return false;
    }

    const descendants = await currentDepartment.getDescendants();
    const descendantIds = descendants.map((d) => d.id);

    // Check if new parent is in the descendants
    return descendantIds.includes(newParentId);
  }
}
