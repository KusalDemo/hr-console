import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuditLogService, AuditRetentionService } from './services';
import {
  CreateAuditLogDto,
  AuditLogSearchDto,
  AuditLogResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * Activities Controller
 * 
 * REST API endpoints for audit logging:
 * - Create audit logs
 * - Search and filter audit logs
 * - Get audit statistics
 * - Export audit logs for compliance
 * - Retention management
 */
@Controller('activities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivitiesController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly auditRetentionService: AuditRetentionService,
  ) {}

  /**
   * Create audit log
   * POST /activities/audit-logs
   */
  @Post('audit-logs')
  @Roles('ADMIN', 'HR', 'SYSTEM')
  @HttpCode(HttpStatus.CREATED)
  async createAuditLog(
    @Body() createDto: CreateAuditLogDto,
  ): Promise<AuditLogResponseDto> {
    return this.auditLogService.createAuditLog(createDto);
  }

  /**
   * Get audit log by ID
   * GET /activities/audit-logs/:id
   */
  @Get('audit-logs/:id')
  @Roles('ADMIN', 'HR')
  async getAuditLog(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AuditLogResponseDto> {
    return this.auditLogService.getAuditLogById(id);
  }

  /**
   * Get audit logs with pagination and filters
   * GET /activities/audit-logs?page=1&limit=20&activityType=ENTITY_CREATED
   */
  @Get('audit-logs')
  @Roles('ADMIN', 'HR')
  async getAuditLogs(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query() filters?: AuditLogSearchDto,
  ): Promise<{ logs: AuditLogResponseDto[]; total: number }> {
    return this.auditLogService.getAuditLogs(page || 1, limit || 20, filters);
  }

  /**
   * Search audit logs
   * GET /activities/audit-logs/search?q=employee&page=1&limit=20
   */
  @Get('audit-logs/search')
  @Roles('ADMIN', 'HR')
  async searchAuditLogs(
    @Query('q') searchTerm: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<{ logs: AuditLogResponseDto[]; total: number }> {
    return this.auditLogService.searchAuditLogs(searchTerm, page || 1, limit || 20);
  }

  /**
   * Get audit logs by actor
   * GET /activities/audit-logs/actor/:actorType/:actorId
   */
  @Get('audit-logs/actor/:actorType/:actorId')
  @Roles('ADMIN', 'HR')
  async getAuditLogsByActor(
    @Param('actorType') actorType: string,
    @Param('actorId', ParseIntPipe) actorId: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditLogService.getAuditLogsByActor(actorType, actorId, limit || 50);
  }

  /**
   * Get audit logs by target entity
   * GET /activities/audit-logs/target/:targetType/:targetId
   */
  @Get('audit-logs/target/:targetType/:targetId')
  @Roles('ADMIN', 'HR')
  async getAuditLogsByTarget(
    @Param('targetType') targetType: string,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditLogService.getAuditLogsByTarget(targetType, targetId, limit || 50);
  }

  /**
   * Get audit statistics
   * GET /activities/statistics?organizationId=1&startDate=2024-01-01&endDate=2024-12-31
   */
  @Get('statistics')
  @Roles('ADMIN', 'HR')
  async getAuditStatistics(
    @Query('organizationId', new ParseIntPipe({ optional: true })) organizationId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    byActivityType: Record<string, number>;
  }> {
    return this.auditLogService.getAuditStatistics(
      organizationId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Export audit logs for compliance
   * GET /activities/audit-logs/export?format=json&...
   */
  @Get('audit-logs/export')
  @Roles('ADMIN')
  async exportAuditLogs(
    @Query() filters?: AuditLogSearchDto,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Res() res: Response,
  ): Promise<void> {
    const exportData = await this.auditLogService.exportAuditLogs(filters, format);

    const contentType = format === 'json' ? 'application/json' : 'text/csv';
    const fileName = `audit-logs-${new Date().toISOString()}.${format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(exportData);
  }

  /**
   * Get retention statistics
   * GET /activities/retention/statistics
   */
  @Get('retention/statistics')
  @Roles('ADMIN')
  async getRetentionStatistics(): Promise<{
    total: number;
    archived: number;
    eligibleForArchival: number;
    eligibleForDeletion: number;
  }> {
    return this.auditRetentionService.getRetentionStatistics();
  }

  /**
   * Manually archive logs
   * POST /activities/retention/archive
   */
  @Post('retention/archive')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async archiveLogs(
    @Body() body: { logIds: number[] },
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string; archived: number }> {
    await this.auditRetentionService.archiveLogsManually(body.logIds, user.userId);
    return {
      message: 'Logs archived successfully',
      archived: body.logIds.length,
    };
  }
}
