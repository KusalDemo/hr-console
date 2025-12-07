import { Injectable } from '@nestjs/common';
import { DataSource, Repository, In } from 'typeorm';
import { Task, TaskStatus, TaskPriority, TaskType } from '../entities/task.entity';

/**
 * Task Repository
 *
 * Custom repository methods for task queries with recursive queries for task hierarchies.
 */
@Injectable()
export class TaskRepository extends Repository<Task> {
  constructor(private dataSource: DataSource) {
    super(Task, dataSource.createEntityManager());
  }

  /**
   * Find task by key
   */
  async findByKey(taskKey: string, includeRelations = false): Promise<Task | null> {
    const query = this.createQueryBuilder('task').where('task.taskKey = :taskKey', { taskKey });

    if (includeRelations) {
      query
        .leftJoinAndSelect('task.project', 'project')
        .leftJoinAndSelect('task.parentTask', 'parentTask')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .leftJoinAndSelect('task.reporter', 'reporter')
        .leftJoinAndSelect('task.additionalAssignees', 'additionalAssignees')
        .leftJoinAndSelect('task.dependencies', 'dependencies')
        .leftJoinAndSelect('dependencies.dependsOnTask', 'dependsOnTask');
    }

    return query.getOne();
  }

  /**
   * Find task by ID
   */
  async findById(id: number, includeRelations = false): Promise<Task | null> {
    const query = this.createQueryBuilder('task').where('task.id = :id', { id });

    if (includeRelations) {
      query
        .leftJoinAndSelect('task.project', 'project')
        .leftJoinAndSelect('task.parentTask', 'parentTask')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .leftJoinAndSelect('task.reporter', 'reporter')
        .leftJoinAndSelect('task.additionalAssignees', 'additionalAssignees')
        .leftJoinAndSelect('task.dependencies', 'dependencies')
        .leftJoinAndSelect('dependencies.dependsOnTask', 'dependsOnTask')
        .leftJoinAndSelect('task.dependents', 'dependents')
        .leftJoinAndSelect('dependents.dependentTask', 'dependentTask');
    }

    return query.getOne();
  }

  /**
   * Find tasks by project
   */
  async findByProject(
    projectId: number,
    includeSubTasks = false,
    includeRelations = false,
  ): Promise<Task[]> {
    const query = this.createQueryBuilder('task')
      .where('task.projectId = :projectId', { projectId })
      .andWhere('task.parentTaskId IS NULL') // Only root tasks by default
      .orderBy('task.createdAt', 'DESC');

    if (includeSubTasks) {
      query.leftJoinAndSelect('task.subTasks', 'subTasks');
    }

    if (includeRelations) {
      query
        .leftJoinAndSelect('task.project', 'project')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .leftJoinAndSelect('task.reporter', 'reporter')
        .leftJoinAndSelect('task.additionalAssignees', 'additionalAssignees');
    }

    return query.getMany();
  }

  /**
   * Find sub-tasks (direct children)
   */
  async findSubTasks(parentTaskId: number, includeRelations = false): Promise<Task[]> {
    const query = this.createQueryBuilder('task')
      .where('task.parentTaskId = :parentTaskId', { parentTaskId })
      .orderBy('task.createdAt', 'ASC');

    if (includeRelations) {
      query
        .leftJoinAndSelect('task.assignee', 'assignee')
        .leftJoinAndSelect('task.reporter', 'reporter')
        .leftJoinAndSelect('task.additionalAssignees', 'additionalAssignees');
    }

    return query.getMany();
  }

  /**
   * Find all sub-tasks recursively (using recursive CTE)
   */
  async findAllSubTasksRecursive(parentTaskId: number): Promise<Task[]> {
    // Use raw SQL for recursive query (PostgreSQL WITH RECURSIVE)
    const result = await this.dataSource.query(
      `
      WITH RECURSIVE task_tree AS (
        -- Base case: direct children
        SELECT id, parent_task_id, title, status, task_key
        FROM tasks
        WHERE parent_task_id = $1
        
        UNION ALL
        
        -- Recursive case: children of children
        SELECT t.id, t.parent_task_id, t.title, t.status, t.task_key
        FROM tasks t
        INNER JOIN task_tree tt ON t.parent_task_id = tt.id
      )
      SELECT * FROM task_tree
      ORDER BY id
    `,
      [parentTaskId],
    );

    // Load full entities
    if (result.length === 0) {
      return [];
    }

    const ids = result.map((r: any) => r.id);
    return this.find({ where: { id: In(ids) } });
  }

  /**
   * Find tasks by status
   */
  async findByStatus(
    status: TaskStatus,
    projectId?: number,
    includeRelations = false,
  ): Promise<Task[]> {
    const query = this.createQueryBuilder('task')
      .where('task.status = :status', { status })
      .orderBy('task.createdAt', 'DESC');

    if (projectId) {
      query.andWhere('task.projectId = :projectId', { projectId });
    }

    if (includeRelations) {
      query
        .leftJoinAndSelect('task.project', 'project')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .leftJoinAndSelect('task.reporter', 'reporter');
    }

    return query.getMany();
  }

  /**
   * Find tasks by priority
   */
  async findByPriority(
    priority: TaskPriority,
    projectId?: number,
    includeRelations = false,
  ): Promise<Task[]> {
    const query = this.createQueryBuilder('task')
      .where('task.priority = :priority', { priority })
      .orderBy('task.createdAt', 'DESC');

    if (projectId) {
      query.andWhere('task.projectId = :projectId', { projectId });
    }

    if (includeRelations) {
      query
        .leftJoinAndSelect('task.project', 'project')
        .leftJoinAndSelect('task.assignee', 'assignee');
    }

    return query.getMany();
  }

  /**
   * Find tasks by assignee
   */
  async findByAssignee(
    employeeId: number,
    includeCompleted = false,
    includeRelations = false,
  ): Promise<Task[]> {
    const query = this.createQueryBuilder('task')
      .where('task.assigneeId = :employeeId', { employeeId })
      .orderBy('task.dueDate', 'ASC')
      .addOrderBy('task.priority', 'DESC');

    if (!includeCompleted) {
      query.andWhere('task.status != :status', { status: TaskStatus.COMPLETED });
    }

    if (includeRelations) {
      query
        .leftJoinAndSelect('task.project', 'project')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .leftJoinAndSelect('task.reporter', 'reporter');
    }

    return query.getMany();
  }

  /**
   * Find tasks assigned to employee (including additional assignees)
   */
  async findAssignedToEmployee(
    employeeId: number,
    includeCompleted = false,
    includeRelations = false,
  ): Promise<Task[]> {
    const query = this.createQueryBuilder('task')
      .leftJoin('task.additionalAssignees', 'additionalAssignees')
      .where('task.assigneeId = :employeeId', { employeeId })
      .orWhere('additionalAssignees.id = :employeeId', { employeeId })
      .orderBy('task.dueDate', 'ASC')
      .addOrderBy('task.priority', 'DESC');

    if (!includeCompleted) {
      query.andWhere('task.status != :status', { status: TaskStatus.COMPLETED });
    }

    if (includeRelations) {
      query
        .leftJoinAndSelect('task.project', 'project')
        .leftJoinAndSelect('task.assignee', 'assignee')
        .leftJoinAndSelect('task.reporter', 'reporter')
        .leftJoinAndSelect('task.additionalAssignees', 'additionalAssignees');
    }

    return query.getMany();
  }

  /**
   * Find overdue tasks
   */
  async findOverdueTasks(projectId?: number, includeRelations = false): Promise<Task[]> {
    const query = this.createQueryBuilder('task')
      .where('task.dueDate < :now', { now: new Date() })
      .andWhere('task.status != :status', { status: TaskStatus.COMPLETED })
      .andWhere('task.status != :cancelled', { cancelled: TaskStatus.CANCELLED })
      .orderBy('task.dueDate', 'ASC');

    if (projectId) {
      query.andWhere('task.projectId = :projectId', { projectId });
    }

    if (includeRelations) {
      query
        .leftJoinAndSelect('task.project', 'project')
        .leftJoinAndSelect('task.assignee', 'assignee');
    }

    return query.getMany();
  }

  /**
   * Find template tasks
   */
  async findTemplates(projectId?: number): Promise<Task[]> {
    const query = this.createQueryBuilder('task')
      .where('task.isTemplate = :isTemplate', { isTemplate: true })
      .orderBy('task.title', 'ASC');

    if (projectId) {
      query.andWhere('task.projectId = :projectId', { projectId });
    }

    return query.getMany();
  }

  /**
   * Find recurring tasks that need to be created
   */
  async findRecurringTasksToCreate(): Promise<Task[]> {
    const now = new Date();

    return this.createQueryBuilder('task')
      .where('task.isRecurring = :isRecurring', { isRecurring: true })
      .andWhere('task.recurrencePattern != :none', { none: 'NONE' })
      .andWhere('task.nextOccurrenceDate <= :now', { now })
      .andWhere('(task.recurrenceEndDate IS NULL OR task.recurrenceEndDate >= :now)', { now })
      .getMany();
  }

  /**
   * Check if task key exists
   */
  async taskKeyExists(taskKey: string, excludeId?: number): Promise<boolean> {
    const query = this.createQueryBuilder('task').where('task.taskKey = :taskKey', { taskKey });

    if (excludeId) {
      query.andWhere('task.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Check for circular dependency in task hierarchy
   */
  async checkCircularReference(taskId: number, parentTaskId: number): Promise<boolean> {
    // Use recursive query to check if parentTaskId is a descendant of taskId
    const result = await this.dataSource.query(
      `
      WITH RECURSIVE task_tree AS (
        SELECT id, parent_task_id
        FROM tasks
        WHERE id = $1
        
        UNION ALL
        
        SELECT t.id, t.parent_task_id
        FROM tasks t
        INNER JOIN task_tree tt ON t.parent_task_id = tt.id
      )
      SELECT COUNT(*) as count
      FROM task_tree
      WHERE id = $2
    `,
      [parentTaskId, taskId],
    );

    return parseInt(result[0]?.count || '0') > 0;
  }

  /**
   * Get task hierarchy depth
   */
  async getTaskDepth(taskId: number): Promise<number> {
    const result = await this.dataSource.query(
      `
      WITH RECURSIVE task_tree AS (
        SELECT id, parent_task_id, 0 as depth
        FROM tasks
        WHERE id = $1
        
        UNION ALL
        
        SELECT t.id, t.parent_task_id, tt.depth + 1
        FROM tasks t
        INNER JOIN task_tree tt ON t.id = tt.parent_task_id
      )
      SELECT MAX(depth) as max_depth
      FROM task_tree
    `,
      [taskId],
    );

    return parseInt(result[0]?.max_depth || '0');
  }
}
