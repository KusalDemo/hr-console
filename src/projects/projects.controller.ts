import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
} from '@nestjs/common';
import { ProjectService } from './services/project.service';
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
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ProjectStatus, ProjectHealth } from './entities/project.entity';

/**
 * Projects Controller
 * 
 * REST API endpoints for project management:
 * - Projects (CRUD, templates, cloning, archiving)
 * - Project phases (CRUD)
 * - Project team members (CRUD)
 * - Dashboard statistics
 * - Budget alerts
 */
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectService: ProjectService) {}

  /**
   * Create a new project
   * POST /projects
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  async createProject(
    @Body() createDto: CreateProjectDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectResponseDto> {
    return this.projectService.createProject(createDto, user.userId);
  }

  /**
   * Get project by ID
   * GET /projects/:id
   */
  @Get(':id')
  async getProject(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeRelations', new ParseBoolPipe({ optional: true })) includeRelations = false,
  ): Promise<ProjectResponseDto> {
    return this.projectService.getProjectById(id, includeRelations);
  }

  /**
   * Get project by key
   * GET /projects/key/:key
   */
  @Get('key/:key')
  async getProjectByKey(
    @Param('key') key: string,
    @Query('includeRelations', new ParseBoolPipe({ optional: true })) includeRelations = false,
  ): Promise<ProjectResponseDto> {
    return this.projectService.getProjectByKey(key, includeRelations);
  }

  /**
   * Update project
   * PUT /projects/:id
   */
  @Put(':id')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  async updateProject(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProjectDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectResponseDto> {
    return this.projectService.updateProject(id, updateDto, user.userId);
  }

  /**
   * Get projects by organization
   * GET /projects/organization/:organizationId
   */
  @Get('organization/:organizationId')
  async getProjectsByOrganization(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
    @Query('includeRelations', new ParseBoolPipe({ optional: true })) includeRelations = false,
  ): Promise<ProjectResponseDto[]> {
    return this.projectService.getProjectsByOrganization(
      organizationId,
      includeArchived,
      includeRelations,
    );
  }

  /**
   * Get projects by status
   * GET /projects/status/:status
   */
  @Get('status/:status')
  async getProjectsByStatus(
    @Param('status') status: ProjectStatus,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
  ): Promise<ProjectResponseDto[]> {
    return this.projectService.getProjectsByStatus(status, organizationId, includeArchived);
  }

  /**
   * Get projects by health indicator
   * GET /projects/health/:health
   */
  @Get('health/:health')
  async getProjectsByHealth(
    @Param('health') health: ProjectHealth,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived = false,
  ): Promise<ProjectResponseDto[]> {
    return this.projectService.getProjectsByHealth(health, organizationId, includeArchived);
  }

  /**
   * Get project dashboard statistics
   * GET /projects/dashboard/stats
   */
  @Get('dashboard/stats')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  async getDashboardStats(
    @Query('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.projectService.getDashboardStats(organizationId);
  }

  /**
   * Get projects with budget alerts
   * GET /projects/alerts/budget
   */
  @Get('alerts/budget')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  async getProjectsWithBudgetAlerts(
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Query('thresholdPercentage', new ParseIntPipe({ optional: true })) thresholdPercentage = 10,
  ): Promise<ProjectResponseDto[]> {
    return this.projectService.getProjectsWithBudgetAlerts(organizationId, thresholdPercentage);
  }

  /**
   * Create project from template
   * POST /projects/templates/:templateId/clone
   */
  @Post('templates/:templateId/clone')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  async createFromTemplate(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() createDto: Partial<CreateProjectDto>,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectResponseDto> {
    return this.projectService.createFromTemplate(templateId, createDto, user.userId);
  }

  /**
   * Clone a project
   * POST /projects/:id/clone
   */
  @Post(':id/clone')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  async cloneProject(
    @Param('id', ParseIntPipe) id: number,
    @Body() createDto: Partial<CreateProjectDto>,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectResponseDto> {
    return this.projectService.cloneProject(id, createDto, user.userId);
  }

  /**
   * Archive a project
   * POST /projects/:id/archive
   */
  @Post(':id/archive')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  async archiveProject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectResponseDto> {
    return this.projectService.archiveProject(id, user.userId);
  }

  /**
   * Unarchive a project
   * POST /projects/:id/unarchive
   */
  @Post(':id/unarchive')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  async unarchiveProject(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProjectResponseDto> {
    return this.projectService.unarchiveProject(id);
  }

  /**
   * Get template projects
   * GET /projects/templates
   */
  @Get('templates')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  async getTemplateProjects(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ): Promise<ProjectResponseDto[]> {
    return this.projectService.getTemplateProjects(organizationId);
  }

  // ========== Project Phases ==========

  /**
   * Create a project phase
   * POST /projects/:projectId/phases
   */
  @Post(':projectId/phases')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  async createPhase(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createDto: CreateProjectPhaseDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectPhaseResponseDto> {
    return this.projectService.createPhase(projectId, createDto, user.userId);
  }

  /**
   * Update a project phase
   * PUT /projects/phases/:id
   */
  @Put('phases/:id')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  async updatePhase(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProjectPhaseDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectPhaseResponseDto> {
    return this.projectService.updatePhase(id, updateDto, user.userId);
  }

  /**
   * Delete a project phase
   * DELETE /projects/phases/:id
   */
  @Delete('phases/:id')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePhase(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.projectService.deletePhase(id);
  }

  // ========== Project Team ==========

  /**
   * Add team member to project
   * POST /projects/:projectId/team
   */
  @Post(':projectId/team')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  async addTeamMember(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createDto: CreateProjectTeamDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectTeamResponseDto> {
    return this.projectService.addTeamMember(projectId, createDto, user.userId);
  }

  /**
   * Update team member
   * PUT /projects/team/:id
   */
  @Put('team/:id')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  async updateTeamMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProjectTeamDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectTeamResponseDto> {
    return this.projectService.updateTeamMember(id, updateDto, user.userId);
  }

  /**
   * Remove team member from project
   * DELETE /projects/team/:id
   */
  @Delete('team/:id')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTeamMember(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.projectService.removeTeamMember(id);
  }
}


