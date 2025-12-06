import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProjectPhase, PhaseStatus } from '../entities/project-phase.entity';

/**
 * Project Phase Repository
 */
@Injectable()
export class ProjectPhaseRepository extends Repository<ProjectPhase> {
  constructor(private dataSource: DataSource) {
    super(ProjectPhase, dataSource.createEntityManager());
  }

  /**
   * Find phases by project
   */
  async findByProject(projectId: number, includeRelations = false): Promise<ProjectPhase[]> {
    const query = this.createQueryBuilder('phase')
      .where('phase.projectId = :projectId', { projectId })
      .orderBy('phase.sequence', 'ASC');

    if (includeRelations) {
      query.leftJoinAndSelect('phase.project', 'project');
    }

    return query.getMany();
  }

  /**
   * Find phase by ID
   */
  async findById(id: number, includeRelations = false): Promise<ProjectPhase | null> {
    const query = this.createQueryBuilder('phase').where('phase.id = :id', { id });

    if (includeRelations) {
      query.leftJoinAndSelect('phase.project', 'project');
    }

    return query.getOne();
  }

  /**
   * Find phases by status
   */
  async findByStatus(
    status: PhaseStatus,
    projectId?: number,
  ): Promise<ProjectPhase[]> {
    const query = this.createQueryBuilder('phase')
      .where('phase.status = :status', { status })
      .orderBy('phase.sequence', 'ASC');

    if (projectId) {
      query.andWhere('phase.projectId = :projectId', { projectId });
    }

    return query.getMany();
  }

  /**
   * Get next sequence number for a project
   */
  async getNextSequence(projectId: number): Promise<number> {
    const result = await this.createQueryBuilder('phase')
      .select('MAX(phase.sequence)', 'maxSequence')
      .where('phase.projectId = :projectId', { projectId })
      .getRawOne();

    return (result?.maxSequence || 0) + 1;
  }
}

