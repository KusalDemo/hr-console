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
} from '@nestjs/common';
import { ProjectFinancialService } from './services/project-financial.service';
import {
  CreateProjectBudgetDto,
  UpdateProjectBudgetDto,
  CreateProjectCostDto,
  UpdateProjectCostDto,
  ProjectBudgetResponseDto,
  ProjectCostResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * Project Financials Controller
 *
 * REST API endpoints for project financial management:
 * - Budget management (CRUD, summaries, alerts)
 * - Cost tracking (CRUD, summaries, profitability)
 * - Financial reports (variance, profitability)
 */
@Controller('project-financials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectFinancialsController {
  constructor(private readonly projectFinancialService: ProjectFinancialService) {}

  // ========== Budget Endpoints ==========

  /**
   * Create a new budget line
   * POST /project-financials/budgets
   */
  @Post('budgets')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'FINANCE')
  async createBudget(
    @Body() createDto: CreateProjectBudgetDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectBudgetResponseDto> {
    return this.projectFinancialService.createBudget(createDto, user.userId);
  }

  /**
   * Get budget by ID
   * GET /project-financials/budgets/:id
   */
  @Get('budgets/:id')
  async getBudget(@Param('id', ParseIntPipe) id: number): Promise<ProjectBudgetResponseDto> {
    return this.projectFinancialService.getBudgetById(id);
  }

  /**
   * Update budget
   * PUT /project-financials/budgets/:id
   */
  @Put('budgets/:id')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'FINANCE')
  async updateBudget(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProjectBudgetDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectBudgetResponseDto> {
    return this.projectFinancialService.updateBudget(id, updateDto, user.userId);
  }

  /**
   * Delete budget
   * DELETE /project-financials/budgets/:id
   */
  @Delete('budgets/:id')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'FINANCE')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBudget(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.projectFinancialService.deleteBudget(id);
  }

  /**
   * Get budgets by project
   * GET /project-financials/projects/:projectId/budgets
   */
  @Get('projects/:projectId/budgets')
  async getBudgetsByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
  ): Promise<ProjectBudgetResponseDto[]> {
    return this.projectFinancialService.getBudgetsByProject(projectId);
  }

  /**
   * Get budget summary
   * GET /project-financials/projects/:projectId/budgets/summary
   */
  @Get('projects/:projectId/budgets/summary')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'FINANCE')
  async getBudgetSummary(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectFinancialService.getBudgetSummary(projectId);
  }

  /**
   * Get budgets with alerts
   * GET /project-financials/projects/:projectId/budgets/alerts
   */
  @Get('projects/:projectId/budgets/alerts')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'FINANCE')
  async getBudgetsWithAlerts(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query('thresholdPercentage', new ParseIntPipe({ optional: true })) thresholdPercentage = 10,
  ): Promise<ProjectBudgetResponseDto[]> {
    return this.projectFinancialService.getBudgetsWithAlerts(projectId, thresholdPercentage);
  }

  // ========== Cost Endpoints ==========

  /**
   * Create a new cost entry
   * POST /project-financials/costs
   */
  @Post('costs')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'FINANCE', 'EMPLOYEE')
  async createCost(
    @Body() createDto: CreateProjectCostDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectCostResponseDto> {
    return this.projectFinancialService.createCost(createDto, user.userId);
  }

  /**
   * Get cost by ID
   * GET /project-financials/costs/:id
   */
  @Get('costs/:id')
  async getCost(@Param('id', ParseIntPipe) id: number): Promise<ProjectCostResponseDto> {
    return this.projectFinancialService.getCostById(id);
  }

  /**
   * Update cost
   * PUT /project-financials/costs/:id
   */
  @Put('costs/:id')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'FINANCE')
  async updateCost(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProjectCostDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectCostResponseDto> {
    return this.projectFinancialService.updateCost(id, updateDto, user.userId);
  }

  /**
   * Delete cost
   * DELETE /project-financials/costs/:id
   */
  @Delete('costs/:id')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'FINANCE')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCost(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.projectFinancialService.deleteCost(id);
  }

  /**
   * Get costs by project
   * GET /project-financials/projects/:projectId/costs
   */
  @Get('projects/:projectId/costs')
  async getCostsByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
  ): Promise<ProjectCostResponseDto[]> {
    return this.projectFinancialService.getCostsByProject(projectId);
  }

  /**
   * Get cost summary
   * GET /project-financials/projects/:projectId/costs/summary
   */
  @Get('projects/:projectId/costs/summary')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'FINANCE')
  async getCostSummary(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectFinancialService.getCostSummary(projectId);
  }

  /**
   * Get profitability analysis
   * GET /project-financials/projects/:projectId/profitability
   */
  @Get('projects/:projectId/profitability')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'FINANCE')
  async getProfitabilityAnalysis(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectFinancialService.getProfitabilityAnalysis(projectId);
  }

  // ========== Financial Reports ==========

  /**
   * Get variance report
   * GET /project-financials/projects/:projectId/variance-report
   */
  @Get('projects/:projectId/variance-report')
  @Roles('ADMIN', 'HR', 'PROJECT_MANAGER', 'FINANCE')
  async getVarianceReport(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.projectFinancialService.getVarianceReport(projectId);
  }
}


