import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './services';
import {
  PerformanceReviewCycleRepository,
  PerformanceReviewRepository,
  PerformanceReviewFormRepository,
} from './repositories';
import {
  PerformanceReviewCycle,
  PerformanceReview,
  PerformanceReviewForm,
} from './entities';
import { Organization } from '../organizations/entities/organization.entity';
import { Employee } from '../employees/entities/employee.entity';

/**
 * Performance Module
 * 
 * Provides comprehensive performance review cycles with:
 * - Review cycle management with periods and templates
 * - Performance reviews with forms, ratings, feedback
 * - Support for 360-degree reviews, self-assessments, manager reviews
 * - Review workflows, calibration, improvement plans
 * - Integration with goals and KPIs
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PerformanceReviewCycle,
      PerformanceReview,
      PerformanceReviewForm,
      Organization,
      Employee,
    ]),
  ],
  controllers: [PerformanceController],
  providers: [
    PerformanceService,
    PerformanceReviewCycleRepository,
    PerformanceReviewRepository,
    PerformanceReviewFormRepository,
  ],
  exports: [
    PerformanceService,
    PerformanceReviewCycleRepository,
    PerformanceReviewRepository,
    PerformanceReviewFormRepository,
  ],
})
export class PerformanceModule {}
