import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { In } from 'typeorm';
import { TaskRepository, TaskDependencyRepository } from '../repositories';
import { EmployeeRepository } from '../../employees/repositories/employee.repository';
import { ProjectRepository } from '../../projects/repositories/project.repository';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
  RecurrencePattern,
} from '../entities/task.entity';
import {
  TaskDependency,
  DependencyType,
} from '../entities/task-dependency.entity';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskResponseDto,
  TaskDependencyResponseDto,
} from '../dto';

/**
 * Task Service
 * 
 * Manages tasks with:
 * - Hierarchical task management (parent-child)
 * - Task dependencies (FS, SS, FF, SF)
 * - Task templates and cloning
 * - Recurring tasks
 * - Status workflow
 * - Integration with time tracking
 */
@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly taskDependencyRepository: TaskDependencyRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  /**
   * Create a new task
   */
  async createTask(
    createDto: CreateTaskDto,
    createdBy?: number,
  ): Promise<TaskResponseDto> {
    // Check if task key already exists
    const exists = await this.taskRepository.taskKeyExists(createDto.taskKey);

    if (exists) {
      throw new ConflictException(`Task key '${createDto.taskKey}' already exists`);
    }

    // Validate project if provided
    if (createDto.projectId) {
      const project = await this.projectRepository.findById(createDto.projectId);

      if (!project) {
        throw new NotFoundException(`Project with ID ${createDto.projectId} not found`);
      }
    }

    // Validate parent task if provided
    if (createDto.parentTaskId) {
      const parentTask = await this.taskRepository.findById(createDto.parentTaskId);

      if (!parentTask) {
        throw new NotFoundException(
          `Parent task with ID ${createDto.parentTaskId} not found`,
        );
      }

      // Check for circular reference
      const isCircular = await this.taskRepository.checkCircularReference(
        createDto.parentTaskId,
        createDto.parentTaskId,
      );

      if (isCircular) {
        throw new BadRequestException('Circular reference detected in task hierarchy');
      }
    }

    // Validate assignee if provided
    if (createDto.assigneeId) {
      const assignee = await this.employeeRepository.findById(createDto.assigneeId);

      if (!assignee) {
        throw new NotFoundException(`Assignee with ID ${createDto.assigneeId} not found`);
      }
    }

    // Validate reporter if provided
    if (createDto.reporterId) {
      const reporter = await this.employeeRepository.findById(createDto.reporterId);

      if (!reporter) {
        throw new NotFoundException(`Reporter with ID ${createDto.reporterId} not found`);
      }
    }

    // Validate additional assignees if provided
    if (createDto.additionalAssigneeIds && createDto.additionalAssigneeIds.length > 0) {
      for (const employeeId of createDto.additionalAssigneeIds) {
        const employee = await this.employeeRepository.findById(employeeId);

        if (!employee) {
          throw new NotFoundException(`Employee with ID ${employeeId} not found`);
        }
      }
    }

    // Create task
    const task = this.taskRepository.create({
      taskKey: createDto.taskKey,
      title: createDto.title,
      description: createDto.description,
      projectId: createDto.projectId,
      parentTaskId: createDto.parentTaskId,
      taskType: createDto.taskType || TaskType.TASK,
      status: createDto.status || TaskStatus.TODO,
      priority: createDto.priority || TaskPriority.MEDIUM,
      assigneeId: createDto.assigneeId,
      reporterId: createDto.reporterId,
      dueDate: createDto.dueDate ? new Date(createDto.dueDate) : null,
      startDate: createDto.startDate ? new Date(createDto.startDate) : null,
      estimatedHours: createDto.estimatedHours || 0,
      storyPoints: createDto.storyPoints,
      isTemplate: createDto.isTemplate || false,
      isRecurring: createDto.isRecurring || false,
      recurrencePattern: createDto.recurrencePattern || RecurrencePattern.NONE,
      recurrenceInterval: createDto.recurrenceInterval,
      recurrenceEndDate: createDto.recurrenceEndDate
        ? new Date(createDto.recurrenceEndDate)
        : null,
      tags: createDto.tags,
      taskMetadata: createDto.taskMetadata,
      createdBy,
    });

    const saved = await this.taskRepository.save(task);

    // Add additional assignees if provided
    if (createDto.additionalAssigneeIds && createDto.additionalAssigneeIds.length > 0) {
      const employees = await this.employeeRepository.find({
        where: { id: In(createDto.additionalAssigneeIds) },
      });
      saved.additionalAssignees = Promise.resolve(employees);
      await this.taskRepository.save(saved);
    }

    // Create dependencies if provided
    if (createDto.dependencies && createDto.dependencies.length > 0) {
      for (const depDto of createDto.dependencies) {
        await this.addDependency(
          saved.id,
          depDto.dependsOnTaskId,
          depDto.dependencyType,
          depDto.lagHours,
          depDto.isHardDependency,
          createdBy,
        );
      }
    }

    // Calculate next occurrence for recurring tasks
    if (saved.isRecurring && saved.recurrencePattern !== RecurrencePattern.NONE) {
      await this.calculateNextOccurrence(saved);
    }

    this.logger.log(`Created task: ${saved.id} (${saved.taskKey})`);

    const reloaded = await this.taskRepository.findById(saved.id, true);
    return TaskResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Update a task
   */
  async updateTask(
    id: number,
    updateDto: UpdateTaskDto,
    updatedBy?: number,
  ): Promise<TaskResponseDto> {
    const task = await this.taskRepository.findById(id);

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Validate parent task if changed
    if (updateDto.parentTaskId !== undefined && updateDto.parentTaskId !== task.parentTaskId) {
      if (updateDto.parentTaskId === task.id) {
        throw new BadRequestException('Task cannot be its own parent');
      }

      if (updateDto.parentTaskId !== null) {
        const parentTask = await this.taskRepository.findById(updateDto.parentTaskId);

        if (!parentTask) {
          throw new NotFoundException(
            `Parent task with ID ${updateDto.parentTaskId} not found`,
          );
        }

        // Check for circular reference
        const isCircular = await this.taskRepository.checkCircularReference(
          task.id,
          updateDto.parentTaskId,
        );

        if (isCircular) {
          throw new BadRequestException('Circular reference detected in task hierarchy');
        }
      }
    }

    // Validate assignee if changed
    if (updateDto.assigneeId !== undefined && updateDto.assigneeId !== task.assigneeId) {
      if (updateDto.assigneeId !== null) {
        const assignee = await this.employeeRepository.findById(updateDto.assigneeId);

        if (!assignee) {
          throw new NotFoundException(`Assignee with ID ${updateDto.assigneeId} not found`);
        }
      }
    }

    // Update task fields
    Object.assign(task, {
      ...updateDto,
      dueDate: updateDto.dueDate ? new Date(updateDto.dueDate) : task.dueDate,
      startDate: updateDto.startDate ? new Date(updateDto.startDate) : task.startDate,
      actualStartDate: updateDto.actualStartDate
        ? new Date(updateDto.actualStartDate)
        : task.actualStartDate,
      completionDate: updateDto.completionDate
        ? new Date(updateDto.completionDate)
        : task.completionDate,
      recurrenceEndDate: updateDto.recurrenceEndDate
        ? new Date(updateDto.recurrenceEndDate)
        : task.recurrenceEndDate,
      nextOccurrenceDate: updateDto.nextOccurrenceDate
        ? new Date(updateDto.nextOccurrenceDate)
        : task.nextOccurrenceDate,
      updatedBy,
    });

    // Update additional assignees if provided
    if (updateDto.additionalAssigneeIds !== undefined) {
      if (updateDto.additionalAssigneeIds.length > 0) {
        const employees = await this.employeeRepository.find({
          where: { id: In(updateDto.additionalAssigneeIds) },
        });
        task.additionalAssignees = Promise.resolve(employees);
      } else {
        task.additionalAssignees = Promise.resolve([]);
      }
    }

    // Update status to completed if completion date is set
    if (updateDto.completionDate && task.status !== TaskStatus.COMPLETED) {
      task.status = TaskStatus.COMPLETED;
    }

    // Update status to in progress if actual start date is set
    if (updateDto.actualStartDate && task.status === TaskStatus.TODO) {
      task.status = TaskStatus.IN_PROGRESS;
    }

    const saved = await this.taskRepository.save(task);

    // Check for blocking dependencies
    await this.checkBlockingDependencies(saved.id);

    this.logger.log(`Updated task: ${id}`);

    const reloaded = await this.taskRepository.findById(saved.id, true);
    return TaskResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Get task by ID
   */
  async getTaskById(id: number, includeRelations = false): Promise<TaskResponseDto> {
    const task = await this.taskRepository.findById(id, includeRelations);

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return TaskResponseDto.fromEntity(task, includeRelations);
  }

  /**
   * Get task by key
   */
  async getTaskByKey(taskKey: string, includeRelations = false): Promise<TaskResponseDto> {
    const task = await this.taskRepository.findByKey(taskKey, includeRelations);

    if (!task) {
      throw new NotFoundException(`Task with key '${taskKey}' not found`);
    }

    return TaskResponseDto.fromEntity(task, includeRelations);
  }

  /**
   * Get tasks by project
   */
  async getTasksByProject(
    projectId: number,
    includeSubTasks = false,
    includeRelations = false,
  ): Promise<TaskResponseDto[]> {
    const tasks = await this.taskRepository.findByProject(
      projectId,
      includeSubTasks,
      includeRelations,
    );

    return tasks.map((task) => TaskResponseDto.fromEntity(task, includeRelations));
  }

  /**
   * Get sub-tasks
   */
  async getSubTasks(
    parentTaskId: number,
    includeRelations = false,
  ): Promise<TaskResponseDto[]> {
    const subTasks = await this.taskRepository.findSubTasks(parentTaskId, includeRelations);

    return subTasks.map((task) => TaskResponseDto.fromEntity(task, includeRelations));
  }

  /**
   * Get all sub-tasks recursively
   */
  async getAllSubTasksRecursive(parentTaskId: number): Promise<TaskResponseDto[]> {
    const subTasks = await this.taskRepository.findAllSubTasksRecursive(parentTaskId);

    return subTasks.map((task) => TaskResponseDto.fromEntity(task));
  }

  /**
   * Get tasks by assignee
   */
  async getTasksByAssignee(
    employeeId: number,
    includeCompleted = false,
    includeRelations = false,
  ): Promise<TaskResponseDto[]> {
    const tasks = await this.taskRepository.findAssignedToEmployee(
      employeeId,
      includeCompleted,
      includeRelations,
    );

    return tasks.map((task) => TaskResponseDto.fromEntity(task, includeRelations));
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(
    projectId?: number,
    includeRelations = false,
  ): Promise<TaskResponseDto[]> {
    const tasks = await this.taskRepository.findOverdueTasks(projectId, includeRelations);

    return tasks.map((task) => TaskResponseDto.fromEntity(task, includeRelations));
  }

  /**
   * Add dependency to a task
   */
  async addDependency(
    dependentTaskId: number,
    dependsOnTaskId: number,
    dependencyType: DependencyType = DependencyType.FS,
    lagHours = 0,
    isHardDependency = true,
    createdBy?: number,
  ): Promise<TaskDependencyResponseDto> {
    // Validate tasks exist
    const dependentTask = await this.taskRepository.findById(dependentTaskId);

    if (!dependentTask) {
      throw new NotFoundException(`Task with ID ${dependentTaskId} not found`);
    }

    const dependsOnTask = await this.taskRepository.findById(dependsOnTaskId);

    if (!dependsOnTask) {
      throw new NotFoundException(`Task with ID ${dependsOnTaskId} not found`);
    }

    // Check for self-dependency
    if (dependentTaskId === dependsOnTaskId) {
      throw new BadRequestException('Task cannot depend on itself');
    }

    // Check if dependency already exists
    const existing = await this.taskDependencyRepository.findByTasks(
      dependentTaskId,
      dependsOnTaskId,
    );

    if (existing) {
      throw new ConflictException('Dependency already exists');
    }

    // Check for circular dependency
    const isCircular = await this.taskDependencyRepository.checkCircularDependency(
      dependentTaskId,
      dependsOnTaskId,
    );

    if (isCircular) {
      throw new BadRequestException('Circular dependency detected');
    }

    const dependency = this.taskDependencyRepository.create({
      dependentTaskId,
      dependsOnTaskId,
      dependencyType,
      lagHours,
      isHardDependency,
      createdBy,
    });

    const saved = await this.taskDependencyRepository.save(dependency);

    // Check if dependent task should be blocked
    await this.checkBlockingDependencies(dependentTaskId);

    this.logger.log(
      `Added dependency: task ${dependentTaskId} depends on task ${dependsOnTaskId}`,
    );

    const reloaded = await this.taskDependencyRepository
      .createQueryBuilder('dependency')
      .leftJoinAndSelect('dependency.dependentTask', 'dependentTask')
      .leftJoinAndSelect('dependency.dependsOnTask', 'dependsOnTask')
      .where('dependency.id = :id', { id: saved.id })
      .getOne();

    return TaskDependencyResponseDto.fromEntity(reloaded!, true);
  }

  /**
   * Remove dependency
   */
  async removeDependency(id: number): Promise<void> {
    const dependency = await this.taskDependencyRepository.findOne({
      where: { id },
    });

    if (!dependency) {
      throw new NotFoundException(`Dependency with ID ${id} not found`);
    }

    await this.taskDependencyRepository.remove(dependency);

    // Re-check blocking dependencies for the dependent task
    await this.checkBlockingDependencies(dependency.dependentTaskId);

    this.logger.log(`Removed dependency: ${id}`);
  }

  /**
   * Check for blocking dependencies and update task status
   */
  private async checkBlockingDependencies(taskId: number): Promise<void> {
    const blockingDeps = await this.taskDependencyRepository.findBlockingDependencies(taskId);

    const task = await this.taskRepository.findById(taskId);

    if (!task) {
      return;
    }

    // If there are hard blocking dependencies and task is not blocked, block it
    if (blockingDeps.length > 0 && task.status !== TaskStatus.BLOCKED) {
      task.status = TaskStatus.BLOCKED;
      await this.taskRepository.save(task);
      this.logger.log(`Task ${taskId} blocked due to dependencies`);
    }
    // If no blocking dependencies and task is blocked, unblock it
    else if (blockingDeps.length === 0 && task.status === TaskStatus.BLOCKED) {
      // Restore to previous status (default to TODO)
      task.status = TaskStatus.TODO;
      await this.taskRepository.save(task);
      this.logger.log(`Task ${taskId} unblocked`);
    }
  }

  /**
   * Create task from template
   */
  async createFromTemplate(
    templateId: number,
    createDto: Partial<CreateTaskDto>,
    createdBy?: number,
  ): Promise<TaskResponseDto> {
    const template = await this.taskRepository.findById(templateId, true);

    if (!template) {
      throw new NotFoundException(`Template task with ID ${templateId} not found`);
    }

    if (!template.isTemplate) {
      throw new BadRequestException(`Task with ID ${templateId} is not a template`);
    }

    // Generate new task key if not provided
    const taskKey =
      createDto.taskKey ||
      `${template.taskKey}-COPY-${Date.now()}`;

    // Check if task key already exists
    const exists = await this.taskRepository.taskKeyExists(taskKey);

    if (exists) {
      throw new ConflictException(`Task key '${taskKey}' already exists`);
    }

    // Create new task from template
    const task = this.taskRepository.create({
      taskKey,
      title: createDto.title || `${template.title} (Copy)`,
      description: createDto.description || template.description,
      projectId: createDto.projectId || template.projectId,
      parentTaskId: createDto.parentTaskId,
      taskType: createDto.taskType || template.taskType,
      status: createDto.status || TaskStatus.TODO,
      priority: createDto.priority || template.priority,
      assigneeId: createDto.assigneeId,
      reporterId: createDto.reporterId,
      dueDate: createDto.dueDate ? new Date(createDto.dueDate) : null,
      startDate: createDto.startDate ? new Date(createDto.startDate) : null,
      estimatedHours: createDto.estimatedHours || template.estimatedHours,
      storyPoints: createDto.storyPoints || template.storyPoints,
      isTemplate: false,
      templateId: template.id,
      tags: createDto.tags || template.tags,
      taskMetadata: createDto.taskMetadata || template.taskMetadata,
      createdBy,
    });

    const saved = await this.taskRepository.save(task);

    this.logger.log(`Created task from template: ${saved.id} (${saved.taskKey})`);

    const reloaded = await this.taskRepository.findById(saved.id, true);
    return TaskResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Calculate next occurrence for recurring task
   */
  private async calculateNextOccurrence(task: Task): Promise<void> {
    if (!task.isRecurring || task.recurrencePattern === RecurrencePattern.NONE) {
      return;
    }

    const now = new Date();
    let nextDate = new Date(task.startDate || task.createdAt);

    // Calculate next occurrence based on pattern
    switch (task.recurrencePattern) {
      case RecurrencePattern.DAILY:
        nextDate.setDate(nextDate.getDate() + (task.recurrenceInterval || 1));
        break;

      case RecurrencePattern.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7 * (task.recurrenceInterval || 1));
        break;

      case RecurrencePattern.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + (task.recurrenceInterval || 1));
        break;

      case RecurrencePattern.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + (task.recurrenceInterval || 1));
        break;

      default:
        return;
    }

    // Check if recurrence has ended
    if (task.recurrenceEndDate && nextDate > task.recurrenceEndDate) {
      task.isRecurring = false;
      task.nextOccurrenceDate = null;
    } else {
      task.nextOccurrenceDate = nextDate;
    }

    await this.taskRepository.save(task);
  }

  /**
   * Process recurring tasks (create new instances)
   */
  async processRecurringTasks(): Promise<void> {
    const recurringTasks = await this.taskRepository.findRecurringTasksToCreate();

    for (const templateTask of recurringTasks) {
      try {
        // Create new task instance
        const newTask = this.taskRepository.create({
          taskKey: `${templateTask.taskKey}-${Date.now()}`,
          title: templateTask.title,
          description: templateTask.description,
          projectId: templateTask.projectId,
          taskType: templateTask.taskType,
          status: TaskStatus.TODO,
          priority: templateTask.priority,
          dueDate: templateTask.nextOccurrenceDate,
          startDate: templateTask.nextOccurrenceDate,
          estimatedHours: templateTask.estimatedHours,
          storyPoints: templateTask.storyPoints,
          isTemplate: false,
          templateId: templateTask.id,
          tags: templateTask.tags,
          taskMetadata: templateTask.taskMetadata,
        });

        await this.taskRepository.save(newTask);

        // Calculate next occurrence for template
        await this.calculateNextOccurrence(templateTask);

        this.logger.log(
          `Created recurring task instance: ${newTask.id} from template ${templateTask.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to create recurring task from template ${templateTask.id}: ${error}`,
        );
      }
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(id: number): Promise<void> {
    const task = await this.taskRepository.findById(id);

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Check if task has sub-tasks
    const subTasks = await this.taskRepository.findSubTasks(id);

    if (subTasks.length > 0) {
      throw new BadRequestException(
        'Cannot delete task with sub-tasks. Please delete sub-tasks first.',
      );
    }

    await this.taskRepository.remove(task);

    this.logger.log(`Deleted task: ${id}`);
  }
}

