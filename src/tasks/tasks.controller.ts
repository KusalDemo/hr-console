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
import { TaskService } from './services/task.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskResponseDto,
  TaskDependencyResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TaskStatus, TaskPriority } from './entities/task.entity';
import { DependencyType } from './entities/task-dependency.entity';

/**
 * Tasks Controller
 * 
 * REST API endpoints for task management:
 * - Tasks (CRUD, templates, recurring tasks)
 * - Task dependencies
 * - Sub-tasks
 * - Task assignments
 */
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly taskService: TaskService) {}

  /**
   * Create a new task
   * POST /tasks
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'EMPLOYEE')
  async createTask(
    @Body() createDto: CreateTaskDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TaskResponseDto> {
    return this.taskService.createTask(createDto, user.userId);
  }

  /**
   * Get task by ID
   * GET /tasks/:id
   */
  @Get(':id')
  async getTask(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeRelations', new ParseBoolPipe({ optional: true })) includeRelations = false,
  ): Promise<TaskResponseDto> {
    return this.taskService.getTaskById(id, includeRelations);
  }

  /**
   * Get task by key
   * GET /tasks/key/:key
   */
  @Get('key/:key')
  async getTaskByKey(
    @Param('key') key: string,
    @Query('includeRelations', new ParseBoolPipe({ optional: true })) includeRelations = false,
  ): Promise<TaskResponseDto> {
    return this.taskService.getTaskByKey(key, includeRelations);
  }

  /**
   * Update task
   * PUT /tasks/:id
   */
  @Put(':id')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'EMPLOYEE')
  async updateTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTaskDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TaskResponseDto> {
    return this.taskService.updateTask(id, updateDto, user.userId);
  }

  /**
   * Delete task
   * DELETE /tasks/:id
   */
  @Delete(':id')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTask(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.taskService.deleteTask(id);
  }

  /**
   * Get tasks by project
   * GET /tasks/project/:projectId
   */
  @Get('project/:projectId')
  async getTasksByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query('includeSubTasks', new ParseBoolPipe({ optional: true })) includeSubTasks = false,
    @Query('includeRelations', new ParseBoolPipe({ optional: true })) includeRelations = false,
  ): Promise<TaskResponseDto[]> {
    return this.taskService.getTasksByProject(projectId, includeSubTasks, includeRelations);
  }

  /**
   * Get sub-tasks
   * GET /tasks/:parentTaskId/subtasks
   */
  @Get(':parentTaskId/subtasks')
  async getSubTasks(
    @Param('parentTaskId', ParseIntPipe) parentTaskId: number,
    @Query('includeRelations', new ParseBoolPipe({ optional: true })) includeRelations = false,
  ): Promise<TaskResponseDto[]> {
    return this.taskService.getSubTasks(parentTaskId, includeRelations);
  }

  /**
   * Get all sub-tasks recursively
   * GET /tasks/:parentTaskId/subtasks/recursive
   */
  @Get(':parentTaskId/subtasks/recursive')
  async getAllSubTasksRecursive(
    @Param('parentTaskId', ParseIntPipe) parentTaskId: number,
  ): Promise<TaskResponseDto[]> {
    return this.taskService.getAllSubTasksRecursive(parentTaskId);
  }

  /**
   * Get tasks by assignee
   * GET /tasks/assignee/:employeeId
   */
  @Get('assignee/:employeeId')
  async getTasksByAssignee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('includeCompleted', new ParseBoolPipe({ optional: true })) includeCompleted = false,
    @Query('includeRelations', new ParseBoolPipe({ optional: true })) includeRelations = false,
  ): Promise<TaskResponseDto[]> {
    return this.taskService.getTasksByAssignee(employeeId, includeCompleted, includeRelations);
  }

  /**
   * Get overdue tasks
   * GET /tasks/overdue
   */
  @Get('overdue')
  async getOverdueTasks(
    @Query('projectId', new ParseIntPipe({ optional: true })) projectId?: number,
    @Query('includeRelations', new ParseBoolPipe({ optional: true })) includeRelations = false,
  ): Promise<TaskResponseDto[]> {
    return this.taskService.getOverdueTasks(projectId, includeRelations);
  }

  /**
   * Create task from template
   * POST /tasks/templates/:templateId/clone
   */
  @Post('templates/:templateId/clone')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  async createFromTemplate(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Body() createDto: Partial<CreateTaskDto>,
    @CurrentUser() user: JwtPayload,
  ): Promise<TaskResponseDto> {
    return this.taskService.createFromTemplate(templateId, createDto, user.userId);
  }

  /**
   * Add dependency to task
   * POST /tasks/:taskId/dependencies
   */
  @Post(':taskId/dependencies')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  async addDependency(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body('dependsOnTaskId', ParseIntPipe) dependsOnTaskId: number,
    @Body('dependencyType') dependencyType: DependencyType,
    @Body('lagHours', new ParseIntPipe({ optional: true })) lagHours = 0,
    @Body('isHardDependency', new ParseBoolPipe({ optional: true })) isHardDependency = true,
    @CurrentUser() user: JwtPayload,
  ): Promise<TaskDependencyResponseDto> {
    return this.taskService.addDependency(
      taskId,
      dependsOnTaskId,
      dependencyType,
      lagHours,
      isHardDependency,
      user.userId,
    );
  }

  /**
   * Remove dependency
   * DELETE /tasks/dependencies/:id
   */
  @Delete('dependencies/:id')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDependency(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.taskService.removeDependency(id);
  }
}

