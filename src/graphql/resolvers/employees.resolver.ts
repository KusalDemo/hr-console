import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  Context,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards, NotFoundException } from '@nestjs/common';
import { EmployeesService } from '../../employees/services/employees.service';
import { EmployeeRepository } from '../../employees/repositories/employee.repository';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Employee } from '../../employees/entities/employee.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { EmployeeDataLoader } from '../dataloaders/employee.dataloader';
import { OrganizationDataLoader } from '../dataloaders/organization.dataloader';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeResponseDto } from '../../employees/dto';

/**
 * Employee GraphQL Object Type
 * Auto-generated from Employee entity
 */
@Resolver(() => Employee)
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesResolver {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly employeeRepository: EmployeeRepository,
    private readonly employeeDataLoader: EmployeeDataLoader,
    private readonly organizationDataLoader: OrganizationDataLoader,
  ) {}

  /**
   * Query: Get employee by ID
   */
  @Query(() => Employee, { name: 'employee', nullable: true })
  @Roles('ROLE_USER', 'ROLE_ADMIN', 'ROLE_HR')
  async getEmployee(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<Employee | null> {
    // Check permissions - users can view employees if they have admin/HR role
    // TODO: Add employee-user relationship check for self-viewing
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      return null;
    }

    // Check if user has admin/HR role
    const hasAdminRole = user.roles?.some((role) => ['ROLE_ADMIN', 'ROLE_HR'].includes(role));
    if (!hasAdminRole) {
      throw new Error('Insufficient permissions to view this employee');
    }

    return employee;
  }

  /**
   * Query: Get all employees (paginated)
   */
  @Query(() => [Employee], { name: 'employees' })
  @Roles('ROLE_ADMIN', 'ROLE_HR')
  async getEmployees(
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 })
    take: number,
    @Args('search', { type: () => String, nullable: true }) search?: string,
    @Args('status', { type: () => String, nullable: true }) status?: string,
  ): Promise<Employee[]> {
    const result = await this.employeeRepository.findWithPagination(
      Math.floor(skip / Math.min(take, 100)) + 1,
      Math.min(take, 100),
      {
        employmentStatus: status as any,
      },
    );
    return result.employees;
  }

  /**
   * Mutation: Create employee
   */
  @Mutation(() => Employee)
  @Roles('ROLE_ADMIN', 'ROLE_HR')
  async createEmployee(
    @Args('input') input: CreateEmployeeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Employee> {
    const employeeResponse = await this.employeesService.createEmployee(input, user.userId);
    // Fetch full entity for GraphQL response
    const employee = await this.employeeRepository.findById(employeeResponse.id);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeResponse.id} not found`);
    }
    return employee;
  }

  /**
   * Mutation: Update employee
   */
  @Mutation(() => Employee)
  @Roles('ROLE_ADMIN', 'ROLE_HR')
  async updateEmployee(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateEmployeeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Employee> {
    await this.employeesService.updateEmployee(id, input, user.userId);
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee;
  }

  /**
   * Mutation: Delete employee (soft delete)
   */
  @Mutation(() => Boolean)
  @Roles('ROLE_ADMIN', 'ROLE_HR')
  async deleteEmployee(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<boolean> {
    await this.employeesService.deleteEmployee(id, user.userId);
    return true;
  }

  /**
   * Resolve field: organization
   * Uses DataLoader to batch load organizations
   */
  @ResolveField(() => Organization, { nullable: true })
  async organization(@Parent() employee: Employee): Promise<Organization | null> {
    if (!employee.organizationId) {
      return null;
    }
    return this.organizationDataLoader.load(employee.organizationId);
  }

  /**
   * Resolve field: manager
   * Uses DataLoader to batch load manager employees
   */
  @ResolveField(() => Employee, { nullable: true })
  async manager(@Parent() employee: Employee): Promise<Employee | null> {
    if (!employee.managerId) {
      return null;
    }
    return this.employeeDataLoader.load(employee.managerId);
  }
}
