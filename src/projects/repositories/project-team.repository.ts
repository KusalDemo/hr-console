import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProjectTeam, ProjectTeamRole } from '../entities/project-team.entity';

/**
 * Project Team Repository
 */
@Injectable()
export class ProjectTeamRepository extends Repository<ProjectTeam> {
  constructor(private dataSource: DataSource) {
    super(ProjectTeam, dataSource.createEntityManager());
  }

  /**
   * Find team members by project
   */
  async findByProject(projectId: number, includeRelations = false): Promise<ProjectTeam[]> {
    const query = this.createQueryBuilder('team')
      .where('team.projectId = :projectId', { projectId })
      .orderBy('team.createdAt', 'ASC');

    if (includeRelations) {
      query
        .leftJoinAndSelect('team.project', 'project')
        .leftJoinAndSelect('team.employee', 'employee');
    }

    return query.getMany();
  }

  /**
   * Find active team members by project
   */
  async findActiveByProject(
    projectId: number,
    includeRelations = false,
  ): Promise<ProjectTeam[]> {
    const query = this.createQueryBuilder('team')
      .where('team.projectId = :projectId', { projectId })
      .andWhere('team.isActive = :isActive', { isActive: true })
      .orderBy('team.createdAt', 'ASC');

    if (includeRelations) {
      query
        .leftJoinAndSelect('team.project', 'project')
        .leftJoinAndSelect('team.employee', 'employee');
    }

    return query.getMany();
  }

  /**
   * Find team member by project and employee
   */
  async findByProjectAndEmployee(
    projectId: number,
    employeeId: number,
    includeRelations = false,
  ): Promise<ProjectTeam | null> {
    const query = this.createQueryBuilder('team')
      .where('team.projectId = :projectId', { projectId })
      .andWhere('team.employeeId = :employeeId', { employeeId });

    if (includeRelations) {
      query
        .leftJoinAndSelect('team.project', 'project')
        .leftJoinAndSelect('team.employee', 'employee');
    }

    return query.getOne();
  }

  /**
   * Find projects by employee
   */
  async findByEmployee(
    employeeId: number,
    includeArchived = false,
    includeRelations = false,
  ): Promise<ProjectTeam[]> {
    const query = this.createQueryBuilder('team')
      .where('team.employeeId = :employeeId', { employeeId })
      .andWhere('team.isActive = :isActive', { isActive: true })
      .orderBy('team.createdAt', 'DESC');

    // Always join project if we need to filter by archived status
    if (!includeArchived || includeRelations) {
      query.leftJoinAndSelect('team.project', 'project');
    }

    if (includeRelations) {
      query.leftJoinAndSelect('team.employee', 'employee');
    }

    if (!includeArchived) {
      query.andWhere('project.isArchived = :isArchived', { isArchived: false });
    }

    return query.getMany();
  }

  /**
   * Find team members by role
   */
  async findByRole(
    role: ProjectTeamRole,
    projectId?: number,
    includeRelations = false,
  ): Promise<ProjectTeam[]> {
    const query = this.createQueryBuilder('team')
      .where('team.role = :role', { role })
      .andWhere('team.isActive = :isActive', { isActive: true })
      .orderBy('team.createdAt', 'ASC');

    if (projectId) {
      query.andWhere('team.projectId = :projectId', { projectId });
    }

    if (includeRelations) {
      query
        .leftJoinAndSelect('team.project', 'project')
        .leftJoinAndSelect('team.employee', 'employee');
    }

    return query.getMany();
  }

  /**
   * Find team member by ID
   */
  async findById(id: number, includeRelations = false): Promise<ProjectTeam | null> {
    const query = this.createQueryBuilder('team').where('team.id = :id', { id });

    if (includeRelations) {
      query
        .leftJoinAndSelect('team.project', 'project')
        .leftJoinAndSelect('team.employee', 'employee');
    }

    return query.getOne();
  }
}

