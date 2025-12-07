import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesService } from './services/employees.service';
import { EmployeeRepository } from './repositories/employee.repository';
import { Employee } from './entities/employee.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationRepository } from '../organizations/repositories/organization.repository';

/**
 * Employees Module
 * 
 * Provides employee management functionality:
 * - Employee CRUD operations
 * - Employee search and filtering
 * - Employee repository access
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Organization]),
  ],
  providers: [
    EmployeesService,
    EmployeeRepository,
    OrganizationRepository,
  ],
  exports: [
    EmployeesService,
    EmployeeRepository,
  ],
})
export class EmployeesModule {}
