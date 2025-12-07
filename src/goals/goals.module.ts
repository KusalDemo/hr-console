import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoalsController } from './goals.controller';
import { GoalService, KeyResultService } from './services';
import { GoalRepository, KeyResultRepository } from './repositories';
import { Goal, KeyResult } from './entities';
import { Organization } from '../organizations/entities/organization.entity';
import { Employee } from '../employees/entities/employee.entity';

/**
 * Goals Module
 *
 * Provides Objectives and Key Results (OKR) tracking with:
 * - Goal CRUD operations
 * - Goal alignment (cascading from org to individual)
 * - Progress tracking
 * - Check-ins and milestone management
 * - Goal templates and cloning
 * - Integration with performance reviews
 * - Recursive queries for goal alignment
 */
@Module({
  imports: [TypeOrmModule.forFeature([Goal, KeyResult, Organization, Employee])],
  controllers: [GoalsController],
  providers: [GoalService, KeyResultService, GoalRepository, KeyResultRepository],
  exports: [GoalService, KeyResultService, GoalRepository, KeyResultRepository],
})
export class GoalsModule {}
