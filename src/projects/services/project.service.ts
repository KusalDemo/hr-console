import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  ProjectRepository,
  ProjectPhaseRepository,
  ProjectTeamRepository,
} from '../repositories';
import { EmployeeRepository } from '../../employees/repositories/employee.repository';
import {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectHealth,
} from '../entities/project.entity';
import { ProjectPhase, PhaseStatus } from '../entities/project-phase.entity';
import { ProjectTeam, ProjectTeamRole } from '../entities/project-team.entity';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateProjectPhaseDto,
  UpdateProjectPhaseDto,
  CreateProjectTeamDto,
  UpdateProjectTeamDto,
  ProjectResponseDto,
  ProjectPhaseResponseDto,
  ProjectTeamResponseDto,
} from '../dto';

/**
 * Project Service
 * 
 * Manages projects with:
 * - Templates and cloning
 * - Archiving
 * - Health indicators
 * - Budget tracking
 * - Time/cost estimates
 * - Integration with time tracking and task management
 */
@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectPhaseRepository: ProjectPhaseRepository,
    private readonly projectTeamRepository: ProjectTeamRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  /**
   * Create a new project
   */
  async createProject(
    createDto: CreateProjectDto,
    createdBy?: number,
  ): Promise<ProjectResponseDto> {
    // Check if project key already exists
    const exists = await this.projectRepository.projectKeyExists(createDto.projectKey);

    if (exists) {
      throw new ConflictException(`Project key '${createDto.projectKey}' already exists`);
    }

    // Validate parent project if provided
    if (createDto.parentProjectId) {
      const parentProject = await this.projectRepository.findById(createDto.parentProjectId);

      if (!parentProject) {
        throw new NotFoundException(
          `Parent project with ID ${createDto.parentProjectId} not found`,
        );
      }

      if (parentProject.organizationId !== createDto.organizationId) {
        throw new BadRequestException(
          'Parent project must belong to the same organization',
        );
      }
    }

    // Validate project manager if provided
    if (createDto.projectManagerId) {
      const manager = await this.employeeRepository.findById(createDto.projectManagerId);

      if (!manager) {
        throw new NotFoundException(
          `Project manager with ID ${createDto.projectManagerId} not found`,
        );
      }
    }

    // Create project
    const project = this.projectRepository.create({
      projectKey: createDto.projectKey,
      name: createDto.name,
      description: createDto.description,
      organizationId: createDto.organizationId,
      parentProjectId: createDto.parentProjectId,
      status: createDto.status || ProjectStatus.PLANNING,
      priority: createDto.priority || ProjectPriority.MEDIUM,
      health: ProjectHealth.HEALTHY,
      startDate: createDto.startDate ? new Date(createDto.startDate) : null,
      endDate: createDto.endDate ? new Date(createDto.endDate) : null,
      projectManagerId: createDto.projectManagerId,
      clientId: createDto.clientId,
      budgetedAmount: createDto.budgetedAmount || 0,
      budgetedHours: createDto.budgetedHours || 0,
      budgetedRevenue: createDto.budgetedRevenue || 0,
      isTemplate: createDto.isTemplate || false,
      projectMetadata: createDto.projectMetadata,
      createdBy,
    });

    const saved = await this.projectRepository.save(project);

    // Create phases if provided
    if (createDto.phases && createDto.phases.length > 0) {
      for (const phaseDto of createDto.phases) {
        await this.createPhase(saved.id, phaseDto, createdBy);
      }
    }

    // Create team members if provided
    if (createDto.teamMembers && createDto.teamMembers.length > 0) {
      for (const teamDto of createDto.teamMembers) {
        await this.addTeamMember(saved.id, teamDto, createdBy);
      }
    }

    // Update health indicator
    await this.updateProjectHealth(saved.id);

    this.logger.log(`Created project: ${saved.id} (${saved.projectKey})`);

    const reloaded = await this.projectRepository.findById(saved.id, true);
    return ProjectResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Update a project
   */
  async updateProject(
    id: number,
    updateDto: UpdateProjectDto,
    updatedBy?: number,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findById(id);

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    if (project.isArchived) {
      throw new BadRequestException('Cannot update archived project');
    }

    // Validate parent project if changed
    if (updateDto.parentProjectId !== undefined && updateDto.parentProjectId !== project.parentProjectId) {
      if (updateDto.parentProjectId === project.id) {
        throw new BadRequestException('Project cannot be its own parent');
      }

      if (updateDto.parentProjectId !== null) {
        const parentProject = await this.projectRepository.findById(updateDto.parentProjectId);

        if (!parentProject) {
          throw new NotFoundException(
            `Parent project with ID ${updateDto.parentProjectId} not found`,
          );
        }

        if (parentProject.organizationId !== project.organizationId) {
          throw new BadRequestException(
            'Parent project must belong to the same organization',
          );
        }

        // Check for circular references
        const isCircular = await this.checkCircularReference(
          updateDto.parentProjectId,
          project.id,
        );

        if (isCircular) {
          throw new BadRequestException('Circular reference detected in project hierarchy');
        }
      }
    }

    // Validate project manager if changed
    if (updateDto.projectManagerId !== undefined && updateDto.projectManagerId !== project.projectManagerId) {
      if (updateDto.projectManagerId !== null) {
        const manager = await this.employeeRepository.findById(updateDto.projectManagerId);

        if (!manager) {
          throw new NotFoundException(
            `Project manager with ID ${updateDto.projectManagerId} not found`,
          );
        }
      }
    }

    // Update project fields
    Object.assign(project, {
      ...updateDto,
      startDate: updateDto.startDate ? new Date(updateDto.startDate) : project.startDate,
      endDate: updateDto.endDate ? new Date(updateDto.endDate) : project.endDate,
      actualCompletionDate: updateDto.actualCompletionDate
        ? new Date(updateDto.actualCompletionDate)
        : project.actualCompletionDate,
      updatedBy,
    });

    const saved = await this.projectRepository.save(project);

    // Update health indicator
    await this.updateProjectHealth(saved.id);

    this.logger.log(`Updated project: ${id}`);

    const reloaded = await this.projectRepository.findById(saved.id, true);
    return ProjectResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Get project by ID
   */
  async getProjectById(id: number, includeRelations = false): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findById(id, includeRelations);

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return ProjectResponseDto.fromEntity(project, includeRelations);
  }

  /**
   * Get project by key
   */
  async getProjectByKey(projectKey: string, includeRelations = false): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findByKey(projectKey, includeRelations);

    if (!project) {
      throw new NotFoundException(`Project with key '${projectKey}' not found`);
    }

    return ProjectResponseDto.fromEntity(project, includeRelations);
  }

  /**
   * Get projects by organization
   */
  async getProjectsByOrganization(
    organizationId: number,
    includeArchived = false,
    includeRelations = false,
  ): Promise<ProjectResponseDto[]> {
    const projects = await this.projectRepository.findByOrganization(
      organizationId,
      includeArchived,
      includeRelations,
    );

    return projects.map((project) => ProjectResponseDto.fromEntity(project, includeRelations));
  }

  /**
   * Get projects by status
   */
  async getProjectsByStatus(
    status: ProjectStatus,
    organizationId?: number,
    includeArchived = false,
  ): Promise<ProjectResponseDto[]> {
    const projects = await this.projectRepository.findByStatus(
      status,
      organizationId,
      includeArchived,
    );

    return projects.map((project) => ProjectResponseDto.fromEntity(project));
  }

  /**
   * Get projects by health indicator
   */
  async getProjectsByHealth(
    health: ProjectHealth,
    organizationId?: number,
    includeArchived = false,
  ): Promise<ProjectResponseDto[]> {
    const projects = await this.projectRepository.findByHealth(
      health,
      organizationId,
      includeArchived,
    );

    return projects.map((project) => ProjectResponseDto.fromEntity(project));
  }

  /**
   * Get project dashboard statistics
   */
  async getDashboardStats(organizationId: number) {
    return this.projectRepository.getDashboardStats(organizationId);
  }

  /**
   * Get projects with budget alerts
   */
  async getProjectsWithBudgetAlerts(
    organizationId: number,
    thresholdPercentage = 10,
  ): Promise<ProjectResponseDto[]> {
    const projects = await this.projectRepository.findProjectsWithBudgetAlerts(
      organizationId,
      thresholdPercentage,
    );

    return projects.map((project) => ProjectResponseDto.fromEntity(project));
  }

  /**
   * Create project from template
   */
  async createFromTemplate(
    templateId: number,
    createDto: Partial<CreateProjectDto>,
    createdBy?: number,
  ): Promise<ProjectResponseDto> {
    const template = await this.projectRepository.findById(templateId, true);

    if (!template) {
      throw new NotFoundException(`Template project with ID ${templateId} not found`);
    }

    if (!template.isTemplate) {
      throw new BadRequestException(`Project with ID ${templateId} is not a template`);
    }

    // Generate new project key if not provided
    const projectKey =
      createDto.projectKey ||
      `${template.projectKey}-COPY-${Date.now()}`;

    // Check if project key already exists
    const exists = await this.projectRepository.projectKeyExists(projectKey);

    if (exists) {
      throw new ConflictException(`Project key '${projectKey}' already exists`);
    }

    // Create new project from template
    const project = this.projectRepository.create({
      projectKey,
      name: createDto.name || `${template.name} (Copy)`,
      description: createDto.description || template.description,
      organizationId: createDto.organizationId || template.organizationId,
      parentProjectId: createDto.parentProjectId,
      status: createDto.status || ProjectStatus.PLANNING,
      priority: createDto.priority || template.priority,
      health: ProjectHealth.HEALTHY,
      startDate: createDto.startDate ? new Date(createDto.startDate) : null,
      endDate: createDto.endDate ? new Date(createDto.endDate) : null,
      projectManagerId: createDto.projectManagerId,
      clientId: createDto.clientId,
      budgetedAmount: createDto.budgetedAmount || template.budgetedAmount,
      budgetedHours: createDto.budgetedHours || template.budgetedHours,
      budgetedRevenue: createDto.budgetedRevenue || template.budgetedRevenue,
      isTemplate: false,
      templateId: template.id,
      projectMetadata: createDto.projectMetadata || template.projectMetadata,
      createdBy,
    });

    const saved = await this.projectRepository.save(project);

    // Clone phases from template
    const templatePhases = await this.projectPhaseRepository.findByProject(template.id);

    for (const templatePhase of templatePhases) {
      await this.createPhase(
        saved.id,
        {
          name: templatePhase.name,
          description: templatePhase.description,
          sequence: templatePhase.sequence,
          status: PhaseStatus.NOT_STARTED,
          budgetedAmount: templatePhase.budgetedAmount,
          budgetedHours: templatePhase.budgetedHours,
          phaseMetadata: templatePhase.phaseMetadata,
        },
        createdBy,
      );
    }

    // Clone team members from template (optional - usually not cloned)
    if (createDto.teamMembers) {
      for (const teamDto of createDto.teamMembers) {
        await this.addTeamMember(saved.id, teamDto, createdBy);
      }
    }

    this.logger.log(`Created project from template: ${saved.id} (${saved.projectKey})`);

    const reloaded = await this.projectRepository.findById(saved.id, true);
    return ProjectResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Clone a project
   */
  async cloneProject(
    id: number,
    createDto: Partial<CreateProjectDto>,
    createdBy?: number,
  ): Promise<ProjectResponseDto> {
    const sourceProject = await this.projectRepository.findById(id, true);

    if (!sourceProject) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Generate new project key if not provided
    const projectKey =
      createDto.projectKey ||
      `${sourceProject.projectKey}-CLONE-${Date.now()}`;

    // Check if project key already exists
    const exists = await this.projectRepository.projectKeyExists(projectKey);

    if (exists) {
      throw new ConflictException(`Project key '${projectKey}' already exists`);
    }

    // Create cloned project
    const project = this.projectRepository.create({
      projectKey,
      name: createDto.name || `${sourceProject.name} (Clone)`,
      description: createDto.description || sourceProject.description,
      organizationId: createDto.organizationId || sourceProject.organizationId,
      parentProjectId: createDto.parentProjectId,
      status: createDto.status || ProjectStatus.PLANNING,
      priority: createDto.priority || sourceProject.priority,
      health: ProjectHealth.HEALTHY,
      startDate: createDto.startDate ? new Date(createDto.startDate) : null,
      endDate: createDto.endDate ? new Date(createDto.endDate) : null,
      projectManagerId: createDto.projectManagerId,
      clientId: createDto.clientId,
      budgetedAmount: createDto.budgetedAmount || sourceProject.budgetedAmount,
      budgetedHours: createDto.budgetedHours || sourceProject.budgetedHours,
      budgetedRevenue: createDto.budgetedRevenue || sourceProject.budgetedRevenue,
      isTemplate: false,
      projectMetadata: createDto.projectMetadata || sourceProject.projectMetadata,
      createdBy,
    });

    const saved = await this.projectRepository.save(project);

    // Clone phases
    const sourcePhases = await this.projectPhaseRepository.findByProject(sourceProject.id);

    for (const sourcePhase of sourcePhases) {
      await this.createPhase(
        saved.id,
        {
          name: sourcePhase.name,
          description: sourcePhase.description,
          sequence: sourcePhase.sequence,
          status: PhaseStatus.NOT_STARTED,
          budgetedAmount: sourcePhase.budgetedAmount,
          budgetedHours: sourcePhase.budgetedHours,
          phaseMetadata: sourcePhase.phaseMetadata,
        },
        createdBy,
      );
    }

    // Clone team members if requested
    if (createDto.teamMembers) {
      for (const teamDto of createDto.teamMembers) {
        await this.addTeamMember(saved.id, teamDto, createdBy);
      }
    }

    this.logger.log(`Cloned project: ${saved.id} (${saved.projectKey}) from ${id}`);

    const reloaded = await this.projectRepository.findById(saved.id, true);
    return ProjectResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Archive a project
   */
  async archiveProject(id: number, archivedBy?: number): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findById(id);

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    if (project.isArchived) {
      throw new BadRequestException('Project is already archived');
    }

    project.isArchived = true;
    project.archivedAt = new Date();
    project.archivedBy = archivedBy;
    project.status = ProjectStatus.ARCHIVED;

    const saved = await this.projectRepository.save(project);

    this.logger.log(`Archived project: ${id}`);

    const reloaded = await this.projectRepository.findById(saved.id, true);
    return ProjectResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Unarchive a project
   */
  async unarchiveProject(id: number): Promise<ProjectResponseDto> {
    const project = await this.projectRepository.findById(id);

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    if (!project.isArchived) {
      throw new BadRequestException('Project is not archived');
    }

    project.isArchived = false;
    project.archivedAt = null;
    project.archivedBy = null;
    project.status = ProjectStatus.ACTIVE;

    const saved = await this.projectRepository.save(project);

    this.logger.log(`Unarchived project: ${id}`);

    const reloaded = await this.projectRepository.findById(saved.id, true);
    return ProjectResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Get template projects
   */
  async getTemplateProjects(organizationId?: number): Promise<ProjectResponseDto[]> {
    const templates = await this.projectRepository.findTemplates(organizationId);

    return templates.map((template) => ProjectResponseDto.fromEntity(template));
  }

  /**
   * Create a project phase
   */
  async createPhase(
    projectId: number,
    createDto: CreateProjectPhaseDto,
    createdBy?: number,
  ): Promise<ProjectPhaseResponseDto> {
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Get next sequence if not provided
    const sequence = createDto.sequence || (await this.projectPhaseRepository.getNextSequence(projectId));

    const phase = this.projectPhaseRepository.create({
      projectId,
      name: createDto.name,
      description: createDto.description,
      sequence,
      status: createDto.status || PhaseStatus.NOT_STARTED,
      startDate: createDto.startDate ? new Date(createDto.startDate) : null,
      endDate: createDto.endDate ? new Date(createDto.endDate) : null,
      budgetedAmount: createDto.budgetedAmount || 0,
      budgetedHours: createDto.budgetedHours || 0,
      phaseMetadata: createDto.phaseMetadata,
      createdBy,
    });

    const saved = await this.projectPhaseRepository.save(phase);

    this.logger.log(`Created project phase: ${saved.id} for project ${projectId}`);

    return ProjectPhaseResponseDto.fromEntity(saved);
  }

  /**
   * Update a project phase
   */
  async updatePhase(
    id: number,
    updateDto: UpdateProjectPhaseDto,
    updatedBy?: number,
  ): Promise<ProjectPhaseResponseDto> {
    const phase = await this.projectPhaseRepository.findById(id);

    if (!phase) {
      throw new NotFoundException(`Project phase with ID ${id} not found`);
    }

    Object.assign(phase, {
      ...updateDto,
      startDate: updateDto.startDate ? new Date(updateDto.startDate) : phase.startDate,
      endDate: updateDto.endDate ? new Date(updateDto.endDate) : phase.endDate,
      actualCompletionDate: updateDto.actualCompletionDate
        ? new Date(updateDto.actualCompletionDate)
        : phase.actualCompletionDate,
      updatedBy,
    });

    const saved = await this.projectPhaseRepository.save(phase);

    // Update project health
    await this.updateProjectHealth(phase.projectId);

    this.logger.log(`Updated project phase: ${id}`);

    return ProjectPhaseResponseDto.fromEntity(saved);
  }

  /**
   * Delete a project phase
   */
  async deletePhase(id: number): Promise<void> {
    const phase = await this.projectPhaseRepository.findById(id);

    if (!phase) {
      throw new NotFoundException(`Project phase with ID ${id} not found`);
    }

    await this.projectPhaseRepository.remove(phase);

    // Update project health
    await this.updateProjectHealth(phase.projectId);

    this.logger.log(`Deleted project phase: ${id}`);
  }

  /**
   * Add team member to project
   */
  async addTeamMember(
    projectId: number,
    createDto: CreateProjectTeamDto,
    createdBy?: number,
  ): Promise<ProjectTeamResponseDto> {
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Check if employee is already assigned
    const existing = await this.projectTeamRepository.findByProjectAndEmployee(
      projectId,
      createDto.employeeId,
    );

    if (existing) {
      throw new ConflictException(
        `Employee ${createDto.employeeId} is already assigned to this project`,
      );
    }

    // Validate employee exists
    const employee = await this.employeeRepository.findById(createDto.employeeId);

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${createDto.employeeId} not found`);
    }

    const teamMember = this.projectTeamRepository.create({
      projectId,
      employeeId: createDto.employeeId,
      role: createDto.role || ProjectTeamRole.CONTRIBUTOR,
      allocationPercentage: createDto.allocationPercentage || 100,
      startDate: createDto.startDate ? new Date(createDto.startDate) : null,
      endDate: createDto.endDate ? new Date(createDto.endDate) : null,
      hourlyRate: createDto.hourlyRate,
      assignmentMetadata: createDto.assignmentMetadata,
      createdBy,
    });

    const saved = await this.projectTeamRepository.save(teamMember);

    this.logger.log(`Added team member: ${saved.id} to project ${projectId}`);

    const reloaded = await this.projectTeamRepository.findById(saved.id, true);
    return ProjectTeamResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Update team member
   */
  async updateTeamMember(
    id: number,
    updateDto: UpdateProjectTeamDto,
    updatedBy?: number,
  ): Promise<ProjectTeamResponseDto> {
    const teamMember = await this.projectTeamRepository.findById(id);

    if (!teamMember) {
      throw new NotFoundException(`Project team member with ID ${id} not found`);
    }

    Object.assign(teamMember, {
      ...updateDto,
      startDate: updateDto.startDate ? new Date(updateDto.startDate) : teamMember.startDate,
      endDate: updateDto.endDate ? new Date(updateDto.endDate) : teamMember.endDate,
      updatedBy,
    });

    const saved = await this.projectTeamRepository.save(teamMember);

    this.logger.log(`Updated team member: ${id}`);

    const reloaded = await this.projectTeamRepository.findById(saved.id, true);
    return ProjectTeamResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Remove team member from project
   */
  async removeTeamMember(id: number): Promise<void> {
    const teamMember = await this.projectTeamRepository.findById(id);

    if (!teamMember) {
      throw new NotFoundException(`Project team member with ID ${id} not found`);
    }

    await this.projectTeamRepository.remove(teamMember);

    this.logger.log(`Removed team member: ${id}`);
  }

  /**
   * Update project health indicator based on budget and schedule
   */
  private async updateProjectHealth(projectId: number): Promise<void> {
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      return;
    }

    let health = ProjectHealth.HEALTHY;
    const issues: string[] = [];

    // Check budget
    if (project.actualCostAmount > project.budgetedAmount) {
      const variancePercentage = project.getBudgetVariancePercentage();

      if (variancePercentage > 20) {
        health = ProjectHealth.CRITICAL;
        issues.push('Significantly over budget');
      } else if (variancePercentage > 10) {
        health = ProjectHealth.OVER_BUDGET;
        issues.push('Over budget');
      } else {
        health = ProjectHealth.AT_RISK;
        issues.push('Approaching budget limit');
      }
    }

    // Check schedule
    if (!project.isOnSchedule()) {
      if (health === ProjectHealth.CRITICAL) {
        health = ProjectHealth.CRITICAL;
      } else if (health === ProjectHealth.OVER_BUDGET) {
        health = ProjectHealth.CRITICAL;
      } else {
        health = ProjectHealth.BEHIND_SCHEDULE;
      }
      issues.push('Behind schedule');
    }

    // Check hours
    if (project.actualHours > project.budgetedHours) {
      const hoursVariancePercentage =
        ((project.actualHours - project.budgetedHours) / project.budgetedHours) * 100;

      if (hoursVariancePercentage > 20) {
        if (health === ProjectHealth.HEALTHY) {
          health = ProjectHealth.AT_RISK;
        }
        issues.push('Exceeding budgeted hours');
      }
    }

    if (health !== project.health) {
      project.health = health;
      await this.projectRepository.save(project);

      this.logger.log(
        `Updated project health: ${projectId} -> ${health} (${issues.join(', ')})`,
      );
    }
  }

  /**
   * Check for circular reference in project hierarchy
   */
  private async checkCircularReference(
    parentId: number,
    childId: number,
  ): Promise<boolean> {
    let currentId: number | null = parentId;
    const visited = new Set<number>();

    while (currentId !== null) {
      if (visited.has(currentId)) {
        return true; // Circular reference detected
      }

      if (currentId === childId) {
        return true; // Would create circular reference
      }

      visited.add(currentId);

      const project = await this.projectRepository.findById(currentId);

      if (!project || !project.parentProjectId) {
        break;
      }

      currentId = project.parentProjectId;
    }

    return false;
  }
}

