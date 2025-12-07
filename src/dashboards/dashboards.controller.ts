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
import { DashboardService } from './services/dashboard.service';
import { WidgetDataService } from './services/widget-data.service';
import {
  CreateDashboardDto,
  UpdateDashboardDto,
  CreateDashboardWidgetDto,
  UpdateDashboardWidgetDto,
  CloneDashboardDto,
  UpdateWidgetOrderDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { DashboardType } from './entities/dashboard.entity';

/**
 * Dashboards Controller
 *
 * REST API endpoints for dashboard management:
 * - Dashboard CRUD operations
 * - Dashboard templates and cloning
 * - Dashboard sharing
 * - Widget management
 * - Widget data retrieval
 * - Layout configuration
 */
@Controller('dashboards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardsController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly widgetDataService: WidgetDataService,
  ) {}

  // ========== Dashboard Endpoints ==========

  /**
   * Create a new dashboard
   * POST /dashboards
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async createDashboard(@Body() createDto: CreateDashboardDto, @CurrentUser() user: JwtPayload) {
    return this.dashboardService.createDashboard(createDto, user.userId);
  }

  /**
   * Get dashboard by ID
   * GET /dashboards/:id
   */
  @Get(':id')
  async getDashboard(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeWidgets', new ParseBoolPipe({ optional: true })) includeWidgets = false,
  ) {
    return this.dashboardService.getDashboardById(id, includeWidgets);
  }

  /**
   * Update dashboard
   * PUT /dashboards/:id
   */
  @Put(':id')
  @Roles('ADMIN', 'HR', 'MANAGER')
  async updateDashboard(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDashboardDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardService.updateDashboard(id, updateDto, user.userId);
  }

  /**
   * Delete dashboard
   * DELETE /dashboards/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async deleteDashboard(@Param('id', ParseIntPipe) id: number) {
    await this.dashboardService.deleteDashboard(id);
  }

  /**
   * Clone dashboard
   * POST /dashboards/:id/clone
   */
  @Post(':id/clone')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async cloneDashboard(
    @Param('id', ParseIntPipe) sourceDashboardId: number,
    @Body() cloneDto: CloneDashboardDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardService.cloneDashboard(
      sourceDashboardId,
      cloneDto.newDashboardName,
      cloneDto.organizationId,
      cloneDto.ownerId,
      user.userId,
    );
  }

  /**
   * Get dashboards by organization
   * GET /dashboards/organization/:organizationId
   */
  @Get('organization/:organizationId')
  async getDashboardsByOrganization(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.dashboardService.getDashboardsByOrganization(organizationId, includeInactive);
  }

  /**
   * Get personal dashboards
   * GET /dashboards/personal
   */
  @Get('personal')
  async getPersonalDashboards(
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardService.getPersonalDashboards(user.userId, organizationId);
  }

  /**
   * Get shared dashboards
   * GET /dashboards/shared
   */
  @Get('shared')
  async getSharedDashboards(
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.dashboardService.getSharedDashboards(organizationId, includeInactive);
  }

  /**
   * Get dashboard templates
   * GET /dashboards/templates
   */
  @Get('templates')
  async getTemplates(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.dashboardService.getTemplates(organizationId);
  }

  /**
   * Get accessible dashboards
   * GET /dashboards/accessible
   */
  @Get('accessible')
  async getAccessibleDashboards(
    @CurrentUser() user: JwtPayload,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Query('departmentId', new ParseIntPipe({ optional: true })) departmentId?: number,
    @Query('teamId', new ParseIntPipe({ optional: true })) teamId?: number,
  ) {
    return this.dashboardService.getAccessibleDashboards(
      user.userId,
      organizationId,
      departmentId,
      teamId,
    );
  }

  /**
   * Search dashboards
   * GET /dashboards/search
   */
  @Get('search')
  async searchDashboards(
    @Query('searchTerm') searchTerm?: string,
    @Query('dashboardType') dashboardType?: DashboardType,
    @Query('category') category?: string,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.dashboardService.searchDashboards(
      searchTerm,
      dashboardType,
      category,
      organizationId,
      includeInactive,
    );
  }

  // ========== Widget Endpoints ==========

  /**
   * Add widget to dashboard
   * POST /dashboards/:dashboardId/widgets
   */
  @Post(':dashboardId/widgets')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async addWidgetToDashboard(
    @Param('dashboardId', ParseIntPipe) dashboardId: number,
    @Body() createWidgetDto: CreateDashboardWidgetDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardService.addWidgetToDashboard(dashboardId, createWidgetDto, user.userId);
  }

  /**
   * Get dashboard widgets
   * GET /dashboards/:dashboardId/widgets
   */
  @Get(':dashboardId/widgets')
  async getDashboardWidgets(
    @Param('dashboardId', ParseIntPipe) dashboardId: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.dashboardService.getDashboardWidgets(dashboardId, includeInactive);
  }

  /**
   * Get widget by ID
   * GET /dashboards/widgets/:id
   */
  @Get('widgets/:id')
  async getWidget(@Param('id', ParseIntPipe) id: number) {
    // This would need a method in the service to get widget by ID
    // For now, we'll use the repository directly in a future update
    throw new Error('Not implemented - use dashboard widgets endpoint');
  }

  /**
   * Update widget
   * PUT /dashboards/widgets/:id
   */
  @Put('widgets/:id')
  @Roles('ADMIN', 'HR', 'MANAGER')
  async updateWidget(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateDashboardWidgetDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardService.updateWidget(id, updateDto, user.userId);
  }

  /**
   * Delete widget
   * DELETE /dashboards/widgets/:id
   */
  @Delete('widgets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async deleteWidget(@Param('id', ParseIntPipe) id: number) {
    await this.dashboardService.deleteWidget(id);
  }

  /**
   * Update widget order
   * PUT /dashboards/:dashboardId/widgets/order
   */
  @Put(':dashboardId/widgets/order')
  @Roles('ADMIN', 'HR', 'MANAGER')
  async updateWidgetOrder(
    @Param('dashboardId', ParseIntPipe) dashboardId: number,
    @Body() updateDto: UpdateWidgetOrderDto,
  ) {
    await this.dashboardService.updateWidgetOrder(dashboardId, updateDto.widgetOrders);
  }

  // ========== Widget Data Endpoints ==========

  /**
   * Get widget data
   * GET /dashboards/widgets/:id/data
   */
  @Get('widgets/:id/data')
  async getWidgetData(
    @Param('id', ParseIntPipe) widgetId: number,
    @Query() filters?: Record<string, any>,
  ) {
    return this.widgetDataService.getWidgetData(widgetId, filters);
  }

  /**
   * Get dashboard widgets data
   * GET /dashboards/:dashboardId/widgets/data
   */
  @Get(':dashboardId/widgets/data')
  async getDashboardWidgetsData(
    @Param('dashboardId', ParseIntPipe) dashboardId: number,
    @Query() filters?: Record<string, any>,
  ) {
    return this.widgetDataService.getDashboardWidgetsData(dashboardId, filters);
  }

  /**
   * Get multiple widgets data
   * POST /dashboards/widgets/data/batch
   */
  @Post('widgets/data/batch')
  async getMultipleWidgetsData(
    @Body() body: { widgetIds: number[]; filters?: Record<string, any> },
  ) {
    return this.widgetDataService.getMultipleWidgetsData(body.widgetIds, body.filters);
  }
}
