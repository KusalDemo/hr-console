import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectService } from './services';
import { ProjectRepository, ProjectPhaseRepository, ProjectTeamRepository } from './repositories';
import { Project, ProjectPhase, ProjectTeam } from './entities';
import { Employee } from '../employees/entities/employee.entity';
import { EmployeeRepository } from '../employees/repositories/employee.repository';
import { Organization } from '../organizations/entities/organization.entity';

/**
 * Projects Module
 *
 * Provides comprehensive project tracking and management:
 * - Project CRUD operations
 * - Project templates and cloning
 * - Project archiving
 * - Project health indicators
 * - Budget tracking
 * - Time/cost estimates
 * - Project phases
 * - Project team management
 * - Integration with time tracking and task management
 */
@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectPhase, ProjectTeam, Employee, Organization])],
  controllers: [ProjectsController],
  providers: [
    ProjectService,
    ProjectRepository,
    ProjectPhaseRepository,
    ProjectTeamRepository,
    EmployeeRepository,
  ],
  exports: [ProjectService, ProjectRepository, ProjectPhaseRepository, ProjectTeamRepository],
})
export class ProjectsModule {}

