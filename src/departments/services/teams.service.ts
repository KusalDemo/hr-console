import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { TeamRepository } from '../repositories/team.repository';
import { DepartmentRepository } from '../repositories/department.repository';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { EmployeeRepository } from '../../employees/repositories/employee.repository';
import { Team, TeamStatus } from '../entities/team.entity';
import { CreateTeamDto, UpdateTeamDto } from '../dto';

/**
 * Teams Service
 *
 * Provides business logic for team operations:
 * - Create team
 * - Get team by ID
 * - Get teams (with filters)
 * - Update team
 * - Delete team (soft delete)
 * - Search teams
 *
 * This service handles all team management operations
 * including validation and organization/department relationships.
 */
@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly departmentRepository: DepartmentRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly employeeRepository: EmployeeRepository,
  ) {}

  /**
   * Create a new team
   *
   * @param createDto - Team creation data
   * @param createdBy - User ID who created the team (optional)
   * @returns Created team information
   */
  async createTeam(createDto: CreateTeamDto, createdBy?: number): Promise<Team> {
    this.logger.log(`Creating team: ${createDto.name}`);

    // Validate organization exists
    const organization = await this.organizationRepository.findById(createDto.organizationId);
    if (!organization) {
      throw new NotFoundException('Organization', createDto.organizationId.toString());
    }

    // Check if team key already exists in organization
    const keyExists = await this.teamRepository.keyExists(
      createDto.organizationId,
      createDto.teamKey,
    );
    if (keyExists) {
      throw new ConflictException(
        `Team with key ${createDto.teamKey} already exists in organization`,
      );
    }

    // Validate department if provided
    if (createDto.departmentId) {
      const department = await this.departmentRepository.findById(createDto.departmentId);
      if (!department) {
        throw new NotFoundException('Department', createDto.departmentId.toString());
      }
      if (department.organizationId !== createDto.organizationId) {
        throw new BadRequestException('Department must belong to the same organization');
      }
    }

    // Validate team lead if provided
    if (createDto.teamLeadId) {
      const teamLead = await this.employeeRepository.findById(createDto.teamLeadId);
      if (!teamLead) {
        throw new NotFoundException('Team Lead', createDto.teamLeadId.toString());
      }
      if (teamLead.organizationId !== createDto.organizationId) {
        throw new BadRequestException('Team lead must belong to the same organization');
      }
    }

    try {
      // Create team entity
      const team = this.teamRepository.create({
        organizationId: createDto.organizationId,
        departmentId: createDto.departmentId || null,
        teamKey: createDto.teamKey,
        name: createDto.name,
        displayName: createDto.displayName || null,
        description: createDto.description || null,
        status: createDto.status || TeamStatus.ACTIVE,
        teamLeadId: createDto.teamLeadId || null,
        sizeLimit: createDto.sizeLimit || null,
        location: createDto.location || null,
        createdBy: createdBy || null,
        updatedBy: createdBy || null,
      });

      // Save team
      const savedTeam = await this.teamRepository.save(team);

      this.logger.log(`Successfully created team ID: ${savedTeam.id}`);

      // Load with relations
      return (await this.teamRepository.findById(savedTeam.id, true)) as Team;
    } catch (error) {
      this.logger.error(
        `Failed to create team: ${createDto.name}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to create team');
    }
  }

  /**
   * Get team by ID
   *
   * @param id - Team ID
   * @returns Team information
   */
  async getTeamById(id: number): Promise<Team> {
    const team = await this.teamRepository.findById(id, true);
    if (!team) {
      throw new NotFoundException('Team', id.toString());
    }

    return team;
  }

  /**
   * Get teams by organization
   *
   * @param organizationId - Organization ID
   * @param activeOnly - Only return active teams
   * @returns Array of teams
   */
  async getTeamsByOrganization(
    organizationId: number,
    activeOnly: boolean = false,
  ): Promise<Team[]> {
    return activeOnly
      ? await this.teamRepository.findActiveByOrganizationId(organizationId)
      : await this.teamRepository.findByOrganizationId(organizationId);
  }

  /**
   * Get teams by department
   *
   * @param departmentId - Department ID
   * @returns Array of teams
   */
  async getTeamsByDepartment(departmentId: number): Promise<Team[]> {
    return this.teamRepository.findByDepartmentId(departmentId);
  }

  /**
   * Get cross-departmental teams (teams without a department)
   *
   * @param organizationId - Organization ID
   * @returns Array of cross-departmental teams
   */
  async getCrossDepartmentalTeams(organizationId: number): Promise<Team[]> {
    return this.teamRepository.findCrossDepartmentalByOrganizationId(organizationId);
  }

  /**
   * Update team
   *
   * @param id - Team ID
   * @param updateDto - Team update data
   * @param updatedBy - User ID who updated the team (optional)
   * @returns Updated team information
   */
  async updateTeam(id: number, updateDto: UpdateTeamDto, updatedBy?: number): Promise<Team> {
    this.logger.log(`Updating team ID: ${id}`);

    // Find team
    const team = await this.teamRepository.findById(id);
    if (!team) {
      throw new NotFoundException('Team', id.toString());
    }

    // Check if team key is being changed and if it already exists
    if (updateDto.teamKey && updateDto.teamKey !== team.teamKey) {
      const keyExists = await this.teamRepository.keyExists(
        team.organizationId,
        updateDto.teamKey,
        id,
      );
      if (keyExists) {
        throw new ConflictException(
          `Team with key ${updateDto.teamKey} already exists in organization`,
        );
      }
    }

    // Validate department if being changed
    if (updateDto.departmentId !== undefined && updateDto.departmentId !== team.departmentId) {
      if (updateDto.departmentId !== null) {
        const department = await this.departmentRepository.findById(updateDto.departmentId);
        if (!department) {
          throw new NotFoundException('Department', updateDto.departmentId.toString());
        }
        if (department.organizationId !== team.organizationId) {
          throw new BadRequestException('Department must belong to the same organization');
        }
      }
    }

    // Validate team lead if being changed
    if (updateDto.teamLeadId !== undefined && updateDto.teamLeadId !== team.teamLeadId) {
      if (updateDto.teamLeadId !== null) {
        const teamLead = await this.employeeRepository.findById(updateDto.teamLeadId);
        if (!teamLead) {
          throw new NotFoundException('Team Lead', updateDto.teamLeadId.toString());
        }
        if (teamLead.organizationId !== team.organizationId) {
          throw new BadRequestException('Team lead must belong to the same organization');
        }
      }
    }

    try {
      // Prepare update data
      const updateData: Partial<Team> = {
        updatedBy: updatedBy || null,
      };

      if (updateDto.teamKey !== undefined) {
        updateData.teamKey = updateDto.teamKey;
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
      if (updateDto.status !== undefined) {
        updateData.status = updateDto.status;
      }
      if (updateDto.departmentId !== undefined) {
        updateData.departmentId = updateDto.departmentId || null;
      }
      if (updateDto.teamLeadId !== undefined) {
        updateData.teamLeadId = updateDto.teamLeadId || null;
      }
      if (updateDto.sizeLimit !== undefined) {
        updateData.sizeLimit = updateDto.sizeLimit || null;
      }
      if (updateDto.location !== undefined) {
        updateData.location = updateDto.location || null;
      }

      // Update team
      await this.teamRepository.update(id, updateData);

      // Fetch updated team with relations
      const updatedTeam = await this.teamRepository.findById(id, true);
      if (!updatedTeam) {
        throw new NotFoundException('Team', id.toString());
      }

      this.logger.log(`Successfully updated team ID: ${id}`);

      return updatedTeam;
    } catch (error) {
      this.logger.error(
        `Failed to update team ID: ${id}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to update team');
    }
  }

  /**
   * Delete team (soft delete)
   *
   * @param id - Team ID
   * @param deletedBy - User ID who deleted the team (optional)
   * @returns Deleted team information
   */
  async deleteTeam(id: number, deletedBy?: number): Promise<Team> {
    this.logger.log(`Deleting team ID: ${id}`);

    const team = await this.teamRepository.findById(id);
    if (!team) {
      throw new NotFoundException('Team', id.toString());
    }

    try {
      // Soft delete: set status to ARCHIVED
      await this.teamRepository.update(id, {
        status: TeamStatus.ARCHIVED,
        updatedBy: deletedBy || null,
      });

      // Fetch updated team
      const deletedTeam = await this.teamRepository.findById(id, true);
      if (!deletedTeam) {
        throw new NotFoundException('Team', id.toString());
      }

      this.logger.log(`Successfully deleted team ID: ${id}`);

      return deletedTeam;
    } catch (error) {
      this.logger.error(
        `Failed to delete team ID: ${id}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Failed to delete team');
    }
  }

  /**
   * Search teams
   *
   * @param searchTerm - Search term (name or key)
   * @param organizationId - Optional organization filter
   * @returns Array of matching teams
   */
  async searchTeams(searchTerm: string, organizationId?: number): Promise<Team[]> {
    return this.teamRepository.search(searchTerm, organizationId);
  }
}
