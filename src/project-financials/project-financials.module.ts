import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectFinancialsController } from './project-financials.controller';
import { ProjectFinancialService } from './services';
import {
  ProjectBudgetRepository,
  ProjectCostRepository,
} from './repositories';
import { ProjectBudget, ProjectCost } from './entities';
import { Project } from '../projects/entities/project.entity';
import { ProjectRepository } from '../projects/repositories/project.repository';
import { Employee } from '../employees/entities/employee.entity';
import { EmployeeRepository } from '../employees/repositories/employee.repository';
import { Task } from '../tasks/entities/task.entity';
import { TaskRepository } from '../tasks/repositories/task.repository';

/**
 * Project Financials Module
 * 
 * Provides project profitability and financial tracking:
 * - Budget management (budget lines, categories, versions)
 * - Cost tracking (labor, materials, expenses)
 * - Budget alerts, variance reporting, forecasting
 * - Profitability analysis
 * - Integration with time tracking for labor costs
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectBudget,
      ProjectCost,
      Project,
      Employee,
      Task,
    ]),
  ],
  controllers: [ProjectFinancialsController],
  providers: [
    ProjectFinancialService,
    ProjectBudgetRepository,
    ProjectCostRepository,
    ProjectRepository,
    EmployeeRepository,
    TaskRepository,
  ],
  exports: [
    ProjectFinancialService,
    ProjectBudgetRepository,
    ProjectCostRepository,
  ],
})
export class ProjectFinancialsModule {}

