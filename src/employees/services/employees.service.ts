import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EmployeeRepository } from '../repositories/employee.repository';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { Employee, EmployeeType, EmploymentStatus } from '../entities/employee.entity';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeResponseDto,
} from '../dto';

/**
 * Employees Service
 * 
 * Provides business logic for employee operations:
 * - Create employee
 * - Get employee by ID
 * - Get employees (with pagination and filters)
 * - Update employee
 * - Delete employee (soft delete)
 * - Search employees
 * 
 * This service handles all employee management operations
 * including validation and organization relationships.
 */
@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly organizationRepository: OrganizationRepository,
  ) {}

  /**
   * Create a new employee
   * 
   * @param createDto - Employee creation data
   * @param createdBy - User ID who created the employee (optional)
   * @returns Created employee information
   */
  async createEmployee(
    createDto: CreateEmployeeDto,
    createdBy?: number,
  ): Promise<EmployeeResponseDto> {
    this.logger.log(`Creating employee: ${createDto.firstName} ${createDto.lastName}`);

    // Validate organization exists
    const organization = await this.organizationRepository.findById(createDto.organizationId);
    if (!organization) {
      throw new NotFoundException('Organization', createDto.organizationId.toString());
    }

    // Check if email already exists
    const emailExists = await this.employeeRepository.emailExists(createDto.email);
    if (emailExists) {
      throw new ConflictException(`Employee with email ${createDto.email} already exists`);
    }

    // Check if employee number already exists (if provided)
    if (createDto.employeeNumber) {
      const employeeNumberExists = await this.employeeRepository.employeeNumberExists(
        createDto.employeeNumber,
      );
      if (employeeNumberExists) {
        throw new ConflictException(
          `Employee with employee number ${createDto.employeeNumber} already exists`,
        );
      }
    }

    // Validate manager exists (if provided)
    if (createDto.managerId) {
      const manager = await this.employeeRepository.findById(createDto.managerId);
      if (!manager) {
        throw new NotFoundException('Manager', createDto.managerId.toString());
      }
    }

    try {
      // Create employee entity
      const employee = this.employeeRepository.create({
        externalId: createDto.externalId || null,
        employeeNumber: createDto.employeeNumber || null,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
        email: createDto.email.trim().toLowerCase(),
        employeeType: createDto.employeeType || EmployeeType.FULL_TIME,
        employmentStatus: createDto.employmentStatus || EmploymentStatus.ACTIVE,
        hireDate: createDto.hireDate ? new Date(createDto.hireDate) : null,
        costCenterId: createDto.costCenterId || null,
        departmentId: createDto.departmentId || null,
        managerId: createDto.managerId || null,
        jobTitle: createDto.jobTitle || null,
        phone: createDto.phone || null,
        mobile: createDto.mobile || null,
        addressLine1: createDto.addressLine1 || null,
        addressLine2: createDto.addressLine2 || null,
        city: createDto.city || null,
        state: createDto.state || null,
        postalCode: createDto.postalCode || null,
        country: createDto.country || null,
        dateOfBirth: createDto.dateOfBirth ? new Date(createDto.dateOfBirth) : null,
        gender: createDto.gender || null,
        nationalId: createDto.nationalId || null,
        taxId: createDto.taxId || null,
        emergencyContactName: createDto.emergencyContactName || null,
        emergencyContactPhone: createDto.emergencyContactPhone || null,
        emergencyContactRelation: createDto.emergencyContactRelation || null,
        profileMetadata: createDto.profileMetadata || null,
        active: createDto.active !== undefined ? createDto.active : true,
        organizationId: createDto.organizationId,
        createdBy: createdBy || null,
        updatedBy: createdBy || null,
      });

      // Save employee
      const savedEmployee = await this.employeeRepository.save(employee);

      // Load with relations
      const employeeWithRelations = await this.employeeRepository.findById(savedEmployee.id, true);

      if (!employeeWithRelations) {
        throw new NotFoundException('Employee', savedEmployee.id.toString());
      }

      this.logger.log(`Successfully created employee ID: ${savedEmployee.id}`);

      return this.toEmployeeResponse(employeeWithRelations);
    } catch (error) {
      this.logger.error(
        `Failed to create employee: ${createDto.email}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to create employee');
    }
  }

  /**
   * Get employee by ID
   * 
   * @param id - Employee ID
   * @returns Employee information
   */
  async getEmployeeById(id: number): Promise<EmployeeResponseDto> {
    const employee = await this.employeeRepository.findById(id, true);
    if (!employee) {
      throw new NotFoundException('Employee', id.toString());
    }

    return this.toEmployeeResponse(employee);
  }

  /**
   * Get employees with pagination and filters
   * 
   * @param page - Page number
   * @param limit - Items per page
   * @param filters - Optional filters
   * @returns Paginated employees
   */
  async getEmployees(
    page: number = 1,
    limit: number = 20,
    filters?: {
      organizationId?: number;
      departmentId?: number;
      managerId?: number;
      employmentStatus?: EmploymentStatus;
      employeeType?: string;
      active?: boolean;
    },
  ): Promise<{ employees: EmployeeResponseDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const { employees, total } = await this.employeeRepository.findWithPagination(
      page,
      limit,
      filters,
    );

    const totalPages = Math.ceil(total / limit);

    return {
      employees: employees.map((emp) => this.toEmployeeResponse(emp)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get employees by organization ID
   * 
   * @param organizationId - Organization ID
   * @param activeOnly - Only return active employees
   * @returns Array of employees
   */
  async getEmployeesByOrganization(
    organizationId: number,
    activeOnly: boolean = false,
  ): Promise<EmployeeResponseDto[]> {
    const employees = activeOnly
      ? await this.employeeRepository.findActiveByOrganizationId(organizationId)
      : await this.employeeRepository.findByOrganizationId(organizationId);

    return employees.map((emp) => this.toEmployeeResponse(emp));
  }

  /**
   * Update employee
   * 
   * @param id - Employee ID
   * @param updateDto - Employee update data
   * @param updatedBy - User ID who updated the employee (optional)
   * @returns Updated employee information
   */
  async updateEmployee(
    id: number,
    updateDto: UpdateEmployeeDto,
    updatedBy?: number,
  ): Promise<EmployeeResponseDto> {
    this.logger.log(`Updating employee ID: ${id}`);

    // Find employee
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundException('Employee', id.toString());
    }

    // Check if email is being changed and if it already exists
    if (updateDto.email && updateDto.email !== employee.email) {
      const emailExists = await this.employeeRepository.emailExists(updateDto.email, id);
      if (emailExists) {
        throw new ConflictException(`Employee with email ${updateDto.email} already exists`);
      }
    }

    // Check if employee number is being changed and if it already exists
    if (updateDto.employeeNumber && updateDto.employeeNumber !== employee.employeeNumber) {
      const employeeNumberExists = await this.employeeRepository.employeeNumberExists(
        updateDto.employeeNumber,
        id,
      );
      if (employeeNumberExists) {
        throw new ConflictException(
          `Employee with employee number ${updateDto.employeeNumber} already exists`,
        );
      }
    }

    // Validate organization if being changed
    if (updateDto.organizationId && updateDto.organizationId !== employee.organizationId) {
      const organization = await this.organizationRepository.findById(updateDto.organizationId);
      if (!organization) {
        throw new NotFoundException('Organization', updateDto.organizationId.toString());
      }
    }

    // Validate manager if being changed
    if (updateDto.managerId !== undefined && updateDto.managerId !== employee.managerId) {
      if (updateDto.managerId !== null) {
        const manager = await this.employeeRepository.findById(updateDto.managerId);
        if (!manager) {
          throw new NotFoundException('Manager', updateDto.managerId.toString());
        }
        // Prevent self-reference
        if (updateDto.managerId === id) {
          throw new BadRequestException('Employee cannot be their own manager');
        }
      }
    }

    try {
      // Prepare update data
      const updateData: Partial<Employee> = {
        updatedBy: updatedBy || null,
      };

      if (updateDto.externalId !== undefined) {
        updateData.externalId = updateDto.externalId || null;
      }
      if (updateDto.employeeNumber !== undefined) {
        updateData.employeeNumber = updateDto.employeeNumber || null;
      }
      if (updateDto.firstName !== undefined) {
        updateData.firstName = updateDto.firstName;
      }
      if (updateDto.lastName !== undefined) {
        updateData.lastName = updateDto.lastName;
      }
      if (updateDto.email !== undefined) {
        updateData.email = updateDto.email.trim().toLowerCase();
      }
      if (updateDto.employeeType !== undefined) {
        updateData.employeeType = updateDto.employeeType;
      }
      if (updateDto.employmentStatus !== undefined) {
        updateData.employmentStatus = updateDto.employmentStatus;
      }
      if (updateDto.hireDate !== undefined) {
        updateData.hireDate = updateDto.hireDate ? new Date(updateDto.hireDate) : null;
      }
      if (updateDto.terminationDate !== undefined) {
        updateData.terminationDate = updateDto.terminationDate
          ? new Date(updateDto.terminationDate)
          : null;
      }
      if (updateDto.terminationReason !== undefined) {
        updateData.terminationReason = updateDto.terminationReason || null;
      }
      if (updateDto.costCenterId !== undefined) {
        updateData.costCenterId = updateDto.costCenterId || null;
      }
      if (updateDto.departmentId !== undefined) {
        updateData.departmentId = updateDto.departmentId || null;
      }
      if (updateDto.managerId !== undefined) {
        updateData.managerId = updateDto.managerId || null;
      }
      if (updateDto.jobTitle !== undefined) {
        updateData.jobTitle = updateDto.jobTitle || null;
      }
      if (updateDto.phone !== undefined) {
        updateData.phone = updateDto.phone || null;
      }
      if (updateDto.mobile !== undefined) {
        updateData.mobile = updateDto.mobile || null;
      }
      if (updateDto.addressLine1 !== undefined) {
        updateData.addressLine1 = updateDto.addressLine1 || null;
      }
      if (updateDto.addressLine2 !== undefined) {
        updateData.addressLine2 = updateDto.addressLine2 || null;
      }
      if (updateDto.city !== undefined) {
        updateData.city = updateDto.city || null;
      }
      if (updateDto.state !== undefined) {
        updateData.state = updateDto.state || null;
      }
      if (updateDto.postalCode !== undefined) {
        updateData.postalCode = updateDto.postalCode || null;
      }
      if (updateDto.country !== undefined) {
        updateData.country = updateDto.country || null;
      }
      if (updateDto.dateOfBirth !== undefined) {
        updateData.dateOfBirth = updateDto.dateOfBirth ? new Date(updateDto.dateOfBirth) : null;
      }
      if (updateDto.gender !== undefined) {
        updateData.gender = updateDto.gender || null;
      }
      if (updateDto.nationalId !== undefined) {
        updateData.nationalId = updateDto.nationalId || null;
      }
      if (updateDto.taxId !== undefined) {
        updateData.taxId = updateDto.taxId || null;
      }
      if (updateDto.emergencyContactName !== undefined) {
        updateData.emergencyContactName = updateDto.emergencyContactName || null;
      }
      if (updateDto.emergencyContactPhone !== undefined) {
        updateData.emergencyContactPhone = updateDto.emergencyContactPhone || null;
      }
      if (updateDto.emergencyContactRelation !== undefined) {
        updateData.emergencyContactRelation = updateDto.emergencyContactRelation || null;
      }
      if (updateDto.profileMetadata !== undefined) {
        updateData.profileMetadata = updateDto.profileMetadata || null;
      }
      if (updateDto.active !== undefined) {
        updateData.active = updateDto.active;
      }
      if (updateDto.organizationId !== undefined) {
        updateData.organizationId = updateDto.organizationId;
      }

      // Update employee
      await this.employeeRepository.update(id, updateData);

      // Fetch updated employee with relations
      const updatedEmployee = await this.employeeRepository.findById(id, true);
      if (!updatedEmployee) {
        throw new NotFoundException('Employee', id.toString());
      }

      this.logger.log(`Successfully updated employee ID: ${id}`);

      return this.toEmployeeResponse(updatedEmployee);
    } catch (error) {
      this.logger.error(
        `Failed to update employee ID: ${id}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to update employee');
    }
  }

  /**
   * Delete employee (soft delete)
   * 
   * @param id - Employee ID
   * @param deletedBy - User ID who deleted the employee (optional)
   * @returns Deleted employee information
   */
  async deleteEmployee(id: number, deletedBy?: number): Promise<EmployeeResponseDto> {
    this.logger.log(`Deleting employee ID: ${id}`);

    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundException('Employee', id.toString());
    }

    try {
      // Soft delete: set active to false and employment status to TERMINATED
      await this.employeeRepository.update(id, {
        active: false,
        employmentStatus: EmploymentStatus.TERMINATED,
        terminationDate: new Date(),
        updatedBy: deletedBy || null,
      });

      // Fetch updated employee
      const deletedEmployee = await this.employeeRepository.findById(id, true);
      if (!deletedEmployee) {
        throw new NotFoundException('Employee', id.toString());
      }

      this.logger.log(`Successfully deleted employee ID: ${id}`);

      return this.toEmployeeResponse(deletedEmployee);
    } catch (error) {
      this.logger.error(
        `Failed to delete employee ID: ${id}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Failed to delete employee');
    }
  }

  /**
   * Search employees
   * 
   * @param searchTerm - Search term (name, email, or employee number)
   * @param organizationId - Optional organization filter
   * @returns Array of matching employees
   */
  async searchEmployees(
    searchTerm: string,
    organizationId?: number,
  ): Promise<EmployeeResponseDto[]> {
    const employees = await this.employeeRepository.search(searchTerm, organizationId);
    return employees.map((emp) => this.toEmployeeResponse(emp));
  }

  /**
   * Convert Employee entity to EmployeeResponseDto
   */
  private toEmployeeResponse(employee: Employee): EmployeeResponseDto {
    return {
      id: employee.id,
      externalId: employee.externalId,
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      fullName: employee.getFullName(),
      email: employee.email,
      employeeType: employee.employeeType,
      employmentStatus: employee.employmentStatus,
      hireDate: employee.hireDate?.toISOString().split('T')[0] || null,
      terminationDate: employee.terminationDate?.toISOString().split('T')[0] || null,
      terminationReason: employee.terminationReason,
      costCenterId: employee.costCenterId,
      departmentId: employee.departmentId,
      managerId: employee.managerId,
      jobTitle: employee.jobTitle,
      phone: employee.phone,
      mobile: employee.mobile,
      addressLine1: employee.addressLine1,
      addressLine2: employee.addressLine2,
      city: employee.city,
      state: employee.state,
      postalCode: employee.postalCode,
      country: employee.country,
      dateOfBirth: employee.dateOfBirth?.toISOString().split('T')[0] || null,
      gender: employee.gender,
      nationalId: employee.nationalId,
      taxId: employee.taxId,
      emergencyContactName: employee.emergencyContactName,
      emergencyContactPhone: employee.emergencyContactPhone,
      emergencyContactRelation: employee.emergencyContactRelation,
      profileMetadata: employee.profileMetadata,
      active: employee.active,
      organizationId: employee.organizationId,
      organization: employee.organization
        ? {
            id: employee.organization.id,
            organizationKey: employee.organization.organizationKey,
            name: employee.organization.name,
          }
        : null,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
      createdBy: employee.createdBy,
      updatedBy: employee.updatedBy,
      // Computed fields
      isActive: employee.isActive(),
      isTerminated: employee.isTerminated(),
      isOnLeave: employee.isOnLeave(),
      yearsOfService: employee.getYearsOfService(),
    };
  }
}

