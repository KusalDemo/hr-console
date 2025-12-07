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
import { JobService } from './services/job.service';
import { CreateJobDto, UpdateJobDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { JobType, JobStatus, JobPriority } from './entities/job-queue.entity';

/**
 * Jobs Controller
 *
 * REST API endpoints for job management:
 * - Job CRUD operations
 * - Job scheduling
 * - Job execution
 * - Job monitoring
 * - Job cancellation
 * - Recurring jobs
 */
@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobsController {
  constructor(private readonly jobService: JobService) {}

  // ========== Job Endpoints ==========

  /**
   * Create a new job
   * POST /jobs
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async createJob(@Body() createDto: CreateJobDto, @CurrentUser() user: JwtPayload) {
    return this.jobService.createJob(createDto, user.userId);
  }

  /**
   * Get job by ID
   * GET /jobs/:id
   */
  @Get(':id')
  async getJob(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeExecutions', new ParseBoolPipe({ optional: true })) includeExecutions = false,
  ) {
    return this.jobService.getJobById(id, includeExecutions);
  }

  /**
   * Update job
   * PUT /jobs/:id
   */
  @Put(':id')
  @Roles('ADMIN', 'HR', 'MANAGER')
  async updateJob(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateJobDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.jobService.updateJob(id, updateDto, user.userId);
  }

  /**
   * Delete job
   * DELETE /jobs/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async deleteJob(@Param('id', ParseIntPipe) id: number) {
    await this.jobService.cancelJob(id);
  }

  /**
   * Execute job immediately
   * POST /jobs/:id/execute
   */
  @Post(':id/execute')
  @Roles('ADMIN', 'HR', 'MANAGER')
  async executeJob(@Param('id', ParseIntPipe) id: number, @Query('workerId') workerId?: string) {
    return this.jobService.executeJob(id, workerId);
  }

  /**
   * Retry failed job
   * POST /jobs/:id/retry
   */
  @Post(':id/retry')
  @Roles('ADMIN', 'HR', 'MANAGER')
  async retryJob(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.retryJob(id);
  }

  /**
   * Cancel job
   * POST /jobs/:id/cancel
   */
  @Post(':id/cancel')
  @Roles('ADMIN', 'HR', 'MANAGER')
  async cancelJob(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.cancelJob(id);
  }

  /**
   * Get jobs by status
   * GET /jobs/status/:status
   */
  @Get('status/:status')
  async getJobsByStatus(
    @Param('status') status: JobStatus,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.jobService.getJobsByStatus(status, organizationId);
  }

  /**
   * Get pending jobs
   * GET /jobs/pending
   */
  @Get('pending')
  @Roles('ADMIN', 'HR')
  async getPendingJobs(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('beforeDate') beforeDate?: string,
  ) {
    return this.jobService.getPendingJobs(
      organizationId,
      beforeDate ? new Date(beforeDate) : undefined,
    );
  }

  /**
   * Get jobs due for execution
   * GET /jobs/due
   */
  @Get('due')
  @Roles('ADMIN', 'HR')
  async getJobsDueForExecution(
    @Query('beforeDate') beforeDate?: string,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.jobService.getJobsDueForExecution(
      beforeDate ? new Date(beforeDate) : undefined,
      organizationId,
    );
  }

  /**
   * Get retryable jobs
   * GET /jobs/retryable
   */
  @Get('retryable')
  @Roles('ADMIN', 'HR')
  async getRetryableJobs(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.jobService.getRetryableJobs(organizationId);
  }

  /**
   * Get job executions
   * GET /jobs/:id/executions
   */
  @Get(':id/executions')
  async getJobExecutions(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.jobService.getJobExecutions(id, limit);
  }

  /**
   * Get job statistics
   * GET /jobs/:id/statistics
   */
  @Get(':id/statistics')
  async getJobStatistics(
    @Param('id', ParseIntPipe) id: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.jobService.getJobStatistics(
      id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Search jobs
   * GET /jobs/search
   */
  @Get('search')
  async searchJobs(
    @Query('searchTerm') searchTerm?: string,
    @Query('jobType') jobType?: JobType,
    @Query('status') status?: JobStatus,
    @Query('priority') priority?: JobPriority,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.jobService.searchJobs(searchTerm, jobType, status, priority, organizationId);
  }
}

