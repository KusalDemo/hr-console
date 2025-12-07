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
import { UseGuards } from '@nestjs/common';
import { ProjectService } from '../../projects/services/project.service';
import { ProjectRepository } from '../../projects/repositories/project.repository';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Project } from '../../projects/entities/project.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { ProjectDataLoader } from '../dataloaders/project.dataloader';
import { OrganizationDataLoader } from '../dataloaders/organization.dataloader';
import { EmployeeDataLoader } from '../dataloaders/employee.dataloader';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponseDto,
} from '../../projects/dto';

/**
 * Project GraphQL Object Type
 * Auto-generated from Project entity
 */
@Resolver(() => Project)
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsResolver {
  constructor(
    private readonly projectService: ProjectService,
    private readonly projectRepository: ProjectRepository,
    private readonly projectDataLoader: ProjectDataLoader,
    private readonly organizationDataLoader: OrganizationDataLoader,
    private readonly employeeDataLoader: EmployeeDataLoader,
  ) {}

  /**
   * Query: Get project by ID
   */
  @Query(() => Project, { name: 'project', nullable: true })
  @Roles('ROLE_USER', 'ROLE_ADMIN', 'ROLE_HR', 'ROLE_PROJECT_MANAGER')
  async getProject(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<Project | null> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      return null;
    }

    // TODO: Add project-level permission checks
    // For now, allow if user has any of the required roles
    return project;
  }

  /**
   * Query: Get all projects (paginated)
   */
  @Query(() => [Project], { name: 'projects' })
  @Roles('ROLE_USER', 'ROLE_ADMIN', 'ROLE_HR', 'ROLE_PROJECT_MANAGER')
  async getProjects(
    @Args('skip', { type: () => Int, nullable: true, defaultValue: 0 })
    skip: number,
    @Args('take', { type: () => Int, nullable: true, defaultValue: 20 })
    take: number,
    @Args('status', { type: () => String, nullable: true }) status?: string,
    @Args('organizationId', { type: () => Int, nullable: true })
    organizationId?: number,
  ): Promise<Project[]> {
    const projects = await this.projectRepository.findAll({
      skip,
      take: Math.min(take, 100), // Limit to 100 max
      status: status as any,
      organizationId,
    });
    return projects;
  }

  /**
   * Mutation: Create project
   */
  @Mutation(() => Project)
  @Roles('ROLE_ADMIN', 'ROLE_HR', 'ROLE_PROJECT_MANAGER')
  async createProject(
    @Args('input') input: CreateProjectDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Project> {
    const projectResponse = await this.projectService.createProject(
      input,
      user.userId,
    );
    // Fetch full entity for GraphQL response
    return this.projectRepository.findById(projectResponse.id);
  }

  /**
   * Mutation: Update project
   */
  @Mutation(() => Project)
  @Roles('ROLE_ADMIN', 'ROLE_HR', 'ROLE_PROJECT_MANAGER')
  async updateProject(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateProjectDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Project> {
    await this.projectService.updateProject(id, input, user.userId);
    return this.projectRepository.findById(id);
  }

  /**
   * Mutation: Delete project
   */
  @Mutation(() => Boolean)
  @Roles('ROLE_ADMIN', 'ROLE_HR')
  async deleteProject(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<boolean> {
    await this.projectService.deleteProject(id, user.userId);
    return true;
  }

  /**
   * Resolve field: organization
   * Uses DataLoader to batch load organizations
   */
  @ResolveField(() => Organization, { nullable: true })
  async organization(@Parent() project: Project): Promise<Organization | null> {
    if (!project.organizationId) {
      return null;
    }
    return this.organizationDataLoader.load(project.organizationId);
  }

  /**
   * Resolve field: parentProject
   * Uses DataLoader to batch load parent projects
   */
  @ResolveField(() => Project, { nullable: true })
  async parentProject(@Parent() project: Project): Promise<Project | null> {
    if (!project.parentProjectId) {
      return null;
    }
    return this.projectDataLoader.load(project.parentProjectId);
  }

  /**
   * Resolve field: projectManager
   * Uses DataLoader to batch load project manager employees
   */
  @ResolveField(() => Employee, { nullable: true })
  async projectManager(@Parent() project: Project): Promise<Employee | null> {
    if (!project.projectManagerId) {
      return null;
    }
    return this.employeeDataLoader.load(project.projectManagerId);
  }
}
