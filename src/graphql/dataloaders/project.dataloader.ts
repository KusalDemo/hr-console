import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { In } from 'typeorm';
import { ProjectRepository } from '../../projects/repositories/project.repository';
import { Project } from '../../projects/entities/project.entity';

/**
 * Project DataLoader
 *
 * Batch loads projects by ID to prevent N+1 queries.
 * Caches results per request.
 */
@Injectable({ scope: Scope.REQUEST })
export class ProjectDataLoader {
  private readonly loader: DataLoader<number, Project | null>;

  constructor(private readonly projectRepository: ProjectRepository) {
    this.loader = new DataLoader<number, Project | null>(
      async (ids: readonly number[]): Promise<(Project | null)[]> => {
        // Batch load all projects using TypeORM's In operator
        const projects = await this.projectRepository.find({
          where: { id: In([...ids]) },
        });

        // Create a map for quick lookup
        const projectMap = new Map<number, Project>();
        projects.forEach((project) => {
          projectMap.set(project.id, project);
        });

        // Return projects in the same order as requested IDs
        return ids.map((id) => projectMap.get(id) || null);
      },
      {
        // Cache results for the duration of the request
        cache: true,
      },
    );
  }

  /**
   * Load a single project by ID
   */
  async load(id: number): Promise<Project | null> {
    return this.loader.load(id);
  }

  /**
   * Load multiple projects by IDs
   */
  async loadMany(ids: number[]): Promise<(Project | null)[]> {
    const results = await this.loader.loadMany(ids);
    return results.map((result) => (result instanceof Error ? null : result));
  }
}
