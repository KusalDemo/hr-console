import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TaskService } from './services';
import { TaskRepository, TaskDependencyRepository } from './repositories';
import { Task, TaskDependency } from './entities';
import { Employee } from '../employees/entities/employee.entity';
import { EmployeeRepository } from '../employees/repositories/employee.repository';
import { Project } from '../projects/entities/project.entity';
import { ProjectRepository } from '../projects/repositories/project.repository';

/**
 * Tasks Module
 * 
 * Provides hierarchical task management with:
 * - Parent-child relationships (sub-tasks)
 * - Task dependencies (FS, SS, FF, SF)
 * - Task assignments (multiple assignees)
 * - Status workflow
 * - Priorities, due dates, estimates vs actuals
 * - Task templates, recurring tasks
 * - Integration with time tracking
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskDependency,
      Employee,
      Project,
    ]),
  ],
  controllers: [TasksController],
  providers: [
    TaskService,
    TaskRepository,
    TaskDependencyRepository,
    EmployeeRepository,
    ProjectRepository,
  ],
  exports: [
    TaskService,
    TaskRepository,
    TaskDependencyRepository,
  ],
})
export class TasksModule {}

