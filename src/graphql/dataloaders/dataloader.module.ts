import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { Project } from '../../projects/entities/project.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { EmployeeRepository } from '../../employees/repositories/employee.repository';
import { ProjectRepository } from '../../projects/repositories/project.repository';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { EmployeeDataLoader } from './employee.dataloader';
import { ProjectDataLoader } from './project.dataloader';
import { OrganizationDataLoader } from './organization.dataloader';

/**
 * DataLoader Module
 * 
 * Provides DataLoader instances for batch loading entities
 * to prevent N+1 query problems in GraphQL resolvers.
 * 
 * DataLoaders are request-scoped and cached per request.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Project, Organization]),
  ],
  providers: [
    EmployeeDataLoader,
    ProjectDataLoader,
    OrganizationDataLoader,
    EmployeeRepository,
    ProjectRepository,
    OrganizationRepository,
  ],
  exports: [
    EmployeeDataLoader,
    ProjectDataLoader,
    OrganizationDataLoader,
  ],
})
export class DataLoaderModule {}
