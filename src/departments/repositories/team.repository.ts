import { Injectable } from '@nestjs/common';
import { DataSource, Repository, IsNull } from 'typeorm';
import { Team, TeamStatus } from '../entities/team.entity';

/**
 * Team Repository
 * Provides custom queries for team operations
 */
@Injectable()
export class TeamRepository extends Repository<Team> {
  constructor(private dataSource: DataSource) {
    super(Team, dataSource.createEntityManager());
  }

  /**
   * Find team by ID
   */
  async findById(id: number, includeRelations = false): Promise<Team | null> {
    const query = this.createQueryBuilder('team').where('team.id = :id', { id });

    if (includeRelations) {
      query
        .leftJoinAndSelect('team.organization', 'organization')
        .leftJoinAndSelect('team.department', 'department')
        .leftJoinAndSelect('team.teamLead', 'teamLead');
    }

    return query.getOne();
  }

  /**
   * Find team by organization and key
   */
  async findByOrganizationAndKey(organizationId: number, teamKey: string): Promise<Team | null> {
    return this.findOne({
      where: {
        organizationId,
        teamKey,
      },
      relations: ['organization', 'department', 'teamLead'],
    });
  }

  /**
   * Find teams by organization ID
   */
  async findByOrganizationId(organizationId: number): Promise<Team[]> {
    return this.find({
      where: {
        organizationId,
      },
      relations: ['organization', 'department', 'teamLead'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find active teams by organization ID
   */
  async findActiveByOrganizationId(organizationId: number): Promise<Team[]> {
    return this.find({
      where: {
        organizationId,
        status: TeamStatus.ACTIVE,
      },
      relations: ['organization', 'department', 'teamLead'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find teams by department ID
   */
  async findByDepartmentId(departmentId: number): Promise<Team[]> {
    return this.find({
      where: {
        departmentId,
      },
      relations: ['organization', 'department', 'teamLead'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find cross-departmental teams (teams without a department)
   */
  async findCrossDepartmentalByOrganizationId(organizationId: number): Promise<Team[]> {
    return this.find({
      where: {
        organizationId,
        departmentId: IsNull(),
      },
      relations: ['organization', 'teamLead'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find teams by team lead ID
   */
  async findByTeamLeadId(teamLeadId: number): Promise<Team[]> {
    return this.find({
      where: {
        teamLeadId,
        status: TeamStatus.ACTIVE,
      },
      relations: ['organization', 'department'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find teams by status
   */
  async findByStatus(status: TeamStatus, organizationId?: number): Promise<Team[]> {
    const where: any = {
      status,
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return this.find({
      where,
      relations: ['organization', 'department', 'teamLead'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Search teams by name
   */
  async search(searchTerm: string, organizationId?: number): Promise<Team[]> {
    const query = this.createQueryBuilder('team')
      .leftJoinAndSelect('team.organization', 'organization')
      .leftJoinAndSelect('team.department', 'department')
      .leftJoinAndSelect('team.teamLead', 'teamLead')
      .where(
        '(LOWER(team.name) LIKE LOWER(:searchTerm) OR LOWER(team.teamKey) LIKE LOWER(:searchTerm))',
        { searchTerm: `%${searchTerm.trim()}%` },
      );

    if (organizationId) {
      query.andWhere('team.organizationId = :organizationId', { organizationId });
    }

    return query.orderBy('team.name', 'ASC').getMany();
  }

  /**
   * Check if team key exists in organization
   */
  async keyExists(organizationId: number, teamKey: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('team')
      .where('team.organizationId = :organizationId', { organizationId })
      .andWhere('team.teamKey = :teamKey', { teamKey });

    if (excludeId) {
      query.andWhere('team.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Count teams by organization
   */
  async countByOrganization(organizationId: number): Promise<number> {
    return this.count({
      where: {
        organizationId,
      },
    });
  }

  /**
   * Count active teams by organization
   */
  async countActiveByOrganization(organizationId: number): Promise<number> {
    return this.count({
      where: {
        organizationId,
        status: TeamStatus.ACTIVE,
      },
    });
  }

  /**
   * Count teams by department
   */
  async countByDepartment(departmentId: number): Promise<number> {
    return this.count({
      where: {
        departmentId,
      },
    });
  }
}
