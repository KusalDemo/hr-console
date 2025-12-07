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
import { ReportService } from './services/report.service';
import {
  CreateReportDefinitionDto,
  UpdateReportDefinitionDto,
  CreateReportScheduleDto,
  UpdateReportScheduleDto,
  CloneReportDto,
  GenerateReportDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  ReportType,
  ReportStatus,
  ReportOutputFormat,
} from './entities/report-definition.entity';

/**
 * Reports Controller
 * 
 * REST API endpoints for report management:
 * - Report definition CRUD operations
 * - Report templates and cloning
 * - Report generation
 * - Report scheduling
 * - Multiple output formats
 * - Email delivery
 */
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportService: ReportService) {}

  // ========== Report Definition Endpoints ==========

  /**
   * Create a new report definition
   * POST /reports
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async createReportDefinition(
    @Body() createDto: CreateReportDefinitionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportService.createReportDefinition(createDto, user.userId);
  }

  /**
   * Get report definition by ID
   * GET /reports/:id
   */
  @Get(':id')
  async getReportDefinition(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeSchedules', new ParseBoolPipe({ optional: true })) includeSchedules = false,
  ) {
    return this.reportService.getReportDefinitionById(id, includeSchedules);
  }

  /**
   * Update report definition
   * PUT /reports/:id
   */
  @Put(':id')
  @Roles('ADMIN', 'HR', 'MANAGER')
  async updateReportDefinition(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateReportDefinitionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportService.updateReportDefinition(id, updateDto, user.userId);
  }

  /**
   * Delete report definition
   * DELETE /reports/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async deleteReportDefinition(@Param('id', ParseIntPipe) id: number) {
    await this.reportService.deleteReportDefinition(id);
  }

  /**
   * Generate report
   * POST /reports/:id/generate
   */
  @Post(':id/generate')
  @Roles('ADMIN', 'HR', 'MANAGER', 'USER')
  async generateReport(
    @Param('id', ParseIntPipe) reportDefinitionId: number,
    @Body() generateDto: GenerateReportDto,
  ) {
    return this.reportService.generateReport(
      reportDefinitionId,
      generateDto.outputFormat,
      generateDto.filters,
    );
  }

  /**
   * Clone report
   * POST /reports/:id/clone
   */
  @Post(':id/clone')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async cloneReport(
    @Param('id', ParseIntPipe) sourceReportId: number,
    @Body() cloneDto: CloneReportDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportService.cloneReport(
      sourceReportId,
      cloneDto.newReportName,
      cloneDto.organizationId,
      user.userId,
    );
  }

  /**
   * Get reports by organization
   * GET /reports/organization/:organizationId
   */
  @Get('organization/:organizationId')
  async getReportsByOrganization(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.reportService.getReportsByOrganization(organizationId, includeInactive);
  }

  /**
   * Get report templates
   * GET /reports/templates
   */
  @Get('templates')
  async getTemplates(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
  ) {
    return this.reportService.getTemplates(organizationId);
  }

  /**
   * Search reports
   * GET /reports/search
   */
  @Get('search')
  async searchReports(
    @Query('searchTerm') searchTerm?: string,
    @Query('reportType') reportType?: ReportType,
    @Query('status') status?: ReportStatus,
    @Query('category') category?: string,
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.reportService.searchReports(
      searchTerm,
      reportType,
      status,
      category,
      organizationId,
      includeInactive,
    );
  }

  // ========== Report Schedule Endpoints ==========

  /**
   * Create report schedule
   * POST /reports/:reportId/schedules
   */
  @Post(':reportId/schedules')
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async createSchedule(
    @Param('reportId', ParseIntPipe) reportId: number,
    @Body() createScheduleDto: CreateReportScheduleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportService.createSchedule(
      reportId,
      createScheduleDto,
      user.userId,
    );
  }

  /**
   * Get report schedules
   * GET /reports/:reportId/schedules
   */
  @Get(':reportId/schedules')
  async getReportSchedules(
    @Param('reportId', ParseIntPipe) reportId: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive = false,
  ) {
    return this.reportService.getReportSchedules(reportId, includeInactive);
  }

  /**
   * Get schedule by ID
   * GET /reports/schedules/:id
   */
  @Get('schedules/:id')
  async getSchedule(@Param('id', ParseIntPipe) id: number) {
    // This would need a method in the service to get schedule by ID
    // For now, we'll use the repository directly in a future update
    throw new Error('Not implemented - use report schedules endpoint');
  }

  /**
   * Update schedule
   * PUT /reports/schedules/:id
   */
  @Put('schedules/:id')
  @Roles('ADMIN', 'HR', 'MANAGER')
  async updateSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateReportScheduleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportService.updateSchedule(id, updateDto, user.userId);
  }

  /**
   * Delete schedule
   * DELETE /reports/schedules/:id
   */
  @Delete('schedules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN', 'HR', 'MANAGER')
  async deleteSchedule(@Param('id', ParseIntPipe) id: number) {
    await this.reportService.deleteSchedule(id);
  }

  /**
   * Get schedules due for execution
   * GET /reports/schedules/due
   */
  @Get('schedules/due')
  @Roles('ADMIN', 'HR')
  async getSchedulesDueForExecution(
    @Query('beforeDate') beforeDate?: string,
  ) {
    return this.reportService.getSchedulesDueForExecution(
      beforeDate ? new Date(beforeDate) : undefined,
    );
  }
}
