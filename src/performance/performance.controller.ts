import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
} from '@nestjs/common';
import { PerformanceService } from './services/performance.service';
import {
  CreateReviewCycleDto,
  CreatePerformanceReviewDto,
  CreateReviewFormDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ReviewCycleStatus } from './entities/performance-review-cycle.entity';
import { ReviewStatus, OverallRating } from './entities/performance-review.entity';

/**
 * Performance Controller
 * 
 * REST API endpoints for performance review management:
 * - Review cycles (CRUD, templates)
 * - Performance reviews (CRUD, workflows)
 * - Review forms (CRUD, submission)
 * - Calibration
 * - Improvement plans
 */
@Controller('performance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  // ========== Review Cycle Endpoints ==========

  /**
   * Create a new review cycle
   * POST /performance/cycles
   */
  @Post('cycles')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async createReviewCycle(
    @Body() createDto: CreateReviewCycleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.performanceService.createReviewCycle(
      {
        ...createDto,
        periodStart: new Date(createDto.periodStart),
        periodEnd: new Date(createDto.periodEnd),
        selfAssessmentStart: createDto.selfAssessmentStart
          ? new Date(createDto.selfAssessmentStart)
          : undefined,
        selfAssessmentEnd: createDto.selfAssessmentEnd
          ? new Date(createDto.selfAssessmentEnd)
          : undefined,
        managerReviewStart: createDto.managerReviewStart
          ? new Date(createDto.managerReviewStart)
          : undefined,
        managerReviewEnd: createDto.managerReviewEnd
          ? new Date(createDto.managerReviewEnd)
          : undefined,
        calibrationStart: createDto.calibrationStart
          ? new Date(createDto.calibrationStart)
          : undefined,
        calibrationEnd: createDto.calibrationEnd
          ? new Date(createDto.calibrationEnd)
          : undefined,
      },
      user.userId,
    );
  }

  /**
   * Get review cycle by ID
   * GET /performance/cycles/:id
   */
  @Get('cycles/:id')
  async getReviewCycle(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeReviews', new ParseBoolPipe({ optional: true })) includeReviews = false,
  ) {
    return this.performanceService.getReviewCycleById(id, includeReviews);
  }

  /**
   * Update review cycle
   * PUT /performance/cycles/:id
   */
  @Put('cycles/:id')
  @Roles('ADMIN', 'HR')
  async updateReviewCycle(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.performanceService.updateReviewCycle(id, updateDto, user.userId);
  }

  /**
   * Start review cycle
   * POST /performance/cycles/:id/start
   */
  @Post('cycles/:id/start')
  @Roles('ADMIN', 'HR')
  async startReviewCycle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.performanceService.startReviewCycle(id, user.userId);
  }

  /**
   * Get review cycles by organization
   * GET /performance/cycles/organization/:organizationId
   */
  @Get('cycles/organization/:organizationId')
  async getReviewCyclesByOrganization(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.performanceService['reviewCycleRepository'].findByOrganization(
      organizationId,
      includeInactive,
    );
  }

  /**
   * Get review cycle statistics
   * GET /performance/cycles/:id/statistics
   */
  @Get('cycles/:id/statistics')
  @Roles('ADMIN', 'HR')
  async getCycleStatistics(@Param('id', ParseIntPipe) id: number) {
    return this.performanceService.getCycleStatistics(id);
  }

  // ========== Performance Review Endpoints ==========

  /**
   * Create a new performance review
   * POST /performance/reviews
   */
  @Post('reviews')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async createPerformanceReview(
    @Body() createDto: CreatePerformanceReviewDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.performanceService.createPerformanceReview(createDto, user.userId);
  }

  /**
   * Get performance review by ID
   * GET /performance/reviews/:id
   */
  @Get('reviews/:id')
  async getPerformanceReview(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeForms', new ParseBoolPipe({ optional: true })) includeForms = false,
  ) {
    return this.performanceService.getPerformanceReviewById(id, includeForms);
  }

  /**
   * Update performance review
   * PUT /performance/reviews/:id
   */
  @Put('reviews/:id')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async updatePerformanceReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.performanceService.updatePerformanceReview(id, updateDto, user.userId);
  }

  /**
   * Complete self-assessment
   * POST /performance/reviews/:id/complete-self-assessment
   */
  @Post('reviews/:id/complete-self-assessment')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async completeSelfAssessment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.performanceService.completeSelfAssessment(id, user.userId);
  }

  /**
   * Complete manager review
   * POST /performance/reviews/:id/complete-manager-review
   */
  @Post('reviews/:id/complete-manager-review')
  @Roles('ADMIN', 'HR')
  async completeManagerReview(
    @Param('id', ParseIntPipe) id: number,
    @Body('overallRating') overallRating?: OverallRating,
    @Body('overallScore', new ParseIntPipe({ optional: true })) overallScore?: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.performanceService.completeManagerReview(
      id,
      overallRating,
      overallScore,
      user.userId,
    );
  }

  /**
   * Complete review
   * POST /performance/reviews/:id/complete
   */
  @Post('reviews/:id/complete')
  @Roles('ADMIN', 'HR')
  async completeReview(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.performanceService.completeReview(id, user.userId);
  }

  /**
   * Acknowledge review
   * POST /performance/reviews/:id/acknowledge
   */
  @Post('reviews/:id/acknowledge')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async acknowledgeReview(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.performanceService.acknowledgeReview(id, user.userId);
  }

  /**
   * Create improvement plan
   * POST /performance/reviews/:id/improvement-plan
   */
  @Post('reviews/:id/improvement-plan')
  @Roles('ADMIN', 'HR')
  async createImprovementPlan(
    @Param('id', ParseIntPipe) id: number,
    @Body('improvementPlan') improvementPlan: Record<string, any>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.performanceService.createImprovementPlan(id, improvementPlan, user.userId);
  }

  /**
   * Get reviews by employee
   * GET /performance/reviews/employee/:employeeId
   */
  @Get('reviews/employee/:employeeId')
  async getReviewsByEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.performanceService.getReviewsByEmployee(employeeId, organizationId);
  }

  /**
   * Get reviews by reviewer
   * GET /performance/reviews/reviewer/:reviewerId
   */
  @Get('reviews/reviewer/:reviewerId')
  async getReviewsByReviewer(
    @Param('reviewerId', ParseIntPipe) reviewerId: number,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.performanceService.getReviewsByReviewer(reviewerId, organizationId);
  }

  // ========== Review Form Endpoints ==========

  /**
   * Create a new review form
   * POST /performance/forms
   */
  @Post('forms')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async createReviewForm(
    @Body() createDto: CreateReviewFormDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.performanceService.createReviewForm(createDto, user.userId);
  }

  /**
   * Update review form
   * PUT /performance/forms/:id
   */
  @Put('forms/:id')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async updateReviewForm(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.performanceService.updateReviewForm(id, updateDto, user.userId);
  }

  /**
   * Submit review form
   * POST /performance/forms/:id/submit
   */
  @Post('forms/:id/submit')
  @Roles('ADMIN', 'HR', 'EMPLOYEE')
  async submitReviewForm(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.performanceService.submitReviewForm(id, user.userId);
  }
}
