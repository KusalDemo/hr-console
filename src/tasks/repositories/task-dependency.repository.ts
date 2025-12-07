import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TaskDependency, DependencyType } from '../entities/task-dependency.entity';

/**
 * Task Dependency Repository
 */
@Injectable()
export class TaskDependencyRepository extends Repository<TaskDependency> {
  constructor(private dataSource: DataSource) {
    super(TaskDependency, dataSource.createEntityManager());
  }

  /**
   * Find dependencies for a task (tasks this task depends on)
   */
  async findDependencies(
    taskId: number,
    includeRelations = false,
  ): Promise<TaskDependency[]> {
    const query = this.createQueryBuilder('dependency')
      .where('dependency.dependentTaskId = :taskId', { taskId })
      .orderBy('dependency.createdAt', 'ASC');

    if (includeRelations) {
      query
        .leftJoinAndSelect('dependency.dependentTask', 'dependentTask')
        .leftJoinAndSelect('dependency.dependsOnTask', 'dependsOnTask');
    }

    return query.getMany();
  }

  /**
   * Find dependents for a task (tasks that depend on this task)
   */
  async findDependents(
    taskId: number,
    includeRelations = false,
  ): Promise<TaskDependency[]> {
    const query = this.createQueryBuilder('dependency')
      .where('dependency.dependsOnTaskId = :taskId', { taskId })
      .orderBy('dependency.createdAt', 'ASC');

    if (includeRelations) {
      query
        .leftJoinAndSelect('dependency.dependentTask', 'dependentTask')
        .leftJoinAndSelect('dependency.dependsOnTask', 'dependsOnTask');
    }

    return query.getMany();
  }

  /**
   * Find dependency by IDs
   */
  async findByTasks(
    dependentTaskId: number,
    dependsOnTaskId: number,
  ): Promise<TaskDependency | null> {
    return this.createQueryBuilder('dependency')
      .where('dependency.dependentTaskId = :dependentTaskId', { dependentTaskId })
      .andWhere('dependency.dependsOnTaskId = :dependsOnTaskId', { dependsOnTaskId })
      .getOne();
  }

  /**
   * Find dependencies by type
   */
  async findByType(
    dependencyType: DependencyType,
    taskId?: number,
  ): Promise<TaskDependency[]> {
    const query = this.createQueryBuilder('dependency')
      .where('dependency.dependencyType = :dependencyType', { dependencyType })
      .orderBy('dependency.createdAt', 'ASC');

    if (taskId) {
      query.andWhere(
        '(dependency.dependentTaskId = :taskId OR dependency.dependsOnTaskId = :taskId)',
        { taskId },
      );
    }

    return query.getMany();
  }

  /**
   * Check if circular dependency exists
   */
  async checkCircularDependency(
    dependentTaskId: number,
    dependsOnTaskId: number,
  ): Promise<boolean> {
    // Check if dependsOnTask depends on dependentTask (would create cycle)
    const reverse = await this.findByTasks(dependsOnTaskId, dependentTaskId);
    return reverse !== null;
  }

  /**
   * Find all blocking dependencies (hard dependencies that are not satisfied)
   */
  async findBlockingDependencies(taskId: number): Promise<TaskDependency[]> {
    return this.createQueryBuilder('dependency')
      .leftJoinAndSelect('dependency.dependsOnTask', 'dependsOnTask')
      .where('dependency.dependentTaskId = :taskId', { taskId })
      .andWhere('dependency.isHardDependency = :isHard', { isHard: true })
      .andWhere('dependsOnTask.status != :completed', {
        completed: 'COMPLETED',
      })
      .getMany();
  }
}


