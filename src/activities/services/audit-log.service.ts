import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuditLogRepository } from '../repositories';
import { AuditLog, AuditLevel, ActivityCategory, ActorType } from '../entities/audit-log.entity';
import { CreateAuditLogDto, AuditLogResponseDto, AuditLogSearchDto } from '../dto';

/**
 * Audit Log Service
 *
 * Manages audit logging operations:
 * - Create audit logs
 * - Search and filter audit logs
 * - Export audit logs for compliance
 * - Get audit statistics
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * Create audit log
   */
  async createAuditLog(createDto: CreateAuditLogDto): Promise<AuditLogResponseDto> {
    try {
      // Calculate field changes if before/after values are provided
      let fieldChanges: Record<string, { before: any; after: any }> | null = null;
      let changeSummary: string | null = null;

      if (createDto.beforeValues || createDto.afterValues) {
        fieldChanges = AuditLog.calculateFieldChanges(
          createDto.beforeValues || null,
          createDto.afterValues || null,
        );
        changeSummary = AuditLog.generateChangeSummary(fieldChanges);
      }

      const auditLog = this.auditLogRepository.create({
        activityType: createDto.activityType,
        activityCategory: createDto.activityCategory || null,
        actorType: createDto.actorType,
        actorId: createDto.actorId || null,
        actorName: createDto.actorName || null,
        targetType: createDto.targetType || null,
        targetId: createDto.targetId || null,
        targetName: createDto.targetName || null,
        organizationId: createDto.organizationId || null,
        description: createDto.description || null,
        metadata: createDto.metadata || null,
        beforeValues: createDto.beforeValues || null,
        afterValues: createDto.afterValues || null,
        fieldChanges,
        changeSummary,
        ipAddress: createDto.ipAddress || null,
        userAgent: createDto.userAgent || null,
        sessionId: createDto.sessionId || null,
        requestId: createDto.requestId || null,
        auditLevel: createDto.auditLevel || AuditLevel.INFO,
        complianceTags: createDto.complianceTags || null,
        isPublic: createDto.isPublic || false,
        isImmutable: true, // Audit logs are immutable by default
      });

      const saved = await this.auditLogRepository.save(auditLog);
      return AuditLogResponseDto.fromEntity(saved);
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error instanceof Error ? error.message : String(error)}`, error);
      throw error;
    }
  }

  /**
   * Get audit log by ID
   */
  async getAuditLogById(id: number): Promise<AuditLogResponseDto> {
    const log = await this.auditLogRepository.findById(id);
    if (!log) {
      throw new NotFoundException(`Audit log not found: ${id}`);
    }
    return AuditLogResponseDto.fromEntity(log);
  }

  /**
   * Get audit logs with pagination and filters
   */
  async getAuditLogs(
    page: number = 1,
    limit: number = 20,
    filters?: AuditLogSearchDto,
  ): Promise<{ logs: AuditLogResponseDto[]; total: number }> {
    const convertedFilters = filters
      ? {
          ...filters,
          startDate: filters.startDate ? new Date(filters.startDate) : undefined,
          endDate: filters.endDate ? new Date(filters.endDate) : undefined,
        }
      : undefined;
    const result = await this.auditLogRepository.findWithPagination(page, limit, convertedFilters);
    return {
      logs: result.logs.map((log) => AuditLogResponseDto.fromEntity(log)),
      total: result.total,
    };
  }

  /**
   * Search audit logs
   */
  async searchAuditLogs(
    searchTerm: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ logs: AuditLogResponseDto[]; total: number }> {
    const result = await this.auditLogRepository.searchAuditLogs(searchTerm, page, limit);
    return {
      logs: result.logs.map((log) => AuditLogResponseDto.fromEntity(log)),
      total: result.total,
    };
  }

  /**
   * Get audit logs by actor
   */
  async getAuditLogsByActor(
    actorType: string,
    actorId: number,
    limit: number = 50,
  ): Promise<AuditLogResponseDto[]> {
    const logs = await this.auditLogRepository.findByActor(actorType, actorId, limit);
    return logs.map((log) => AuditLogResponseDto.fromEntity(log));
  }

  /**
   * Get audit logs by target entity
   */
  async getAuditLogsByTarget(
    targetType: string,
    targetId: number,
    limit: number = 50,
  ): Promise<AuditLogResponseDto[]> {
    const logs = await this.auditLogRepository.findByTarget(targetType, targetId, limit);
    return logs.map((log) => AuditLogResponseDto.fromEntity(log));
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(
    organizationId?: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    byActivityType: Record<string, number>;
  }> {
    return this.auditLogRepository.getAuditStatistics(organizationId, startDate, endDate);
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(
    filters?: AuditLogSearchDto,
    format: 'json' | 'csv' = 'json',
  ): Promise<string> {
    // Get all matching logs (no pagination for export)
    const convertedFilters = filters
      ? {
          ...filters,
          startDate: filters.startDate ? new Date(filters.startDate) : undefined,
          endDate: filters.endDate ? new Date(filters.endDate) : undefined,
        }
      : undefined;
    const result = await this.auditLogRepository.findWithPagination(
      1,
      100000, // Large limit for export
      convertedFilters,
    );

    if (format === 'json') {
      return JSON.stringify(
        result.logs.map((log) => AuditLogResponseDto.fromEntity(log)),
        null,
        2,
      );
    } else if (format === 'csv') {
      // Convert to CSV
      if (result.logs.length === 0) {
        return '';
      }

      const headers = [
        'ID',
        'Activity Type',
        'Category',
        'Actor Type',
        'Actor ID',
        'Actor Name',
        'Target Type',
        'Target ID',
        'Target Name',
        'Description',
        'Audit Level',
        'IP Address',
        'Created At',
      ];

      const rows = result.logs.map((log) => [
        log.id,
        log.activityType,
        log.activityCategory || '',
        log.actorType,
        log.actorId || '',
        log.actorName || '',
        log.targetType || '',
        log.targetId || '',
        log.targetName || '',
        log.description || '',
        log.auditLevel,
        log.ipAddress || '',
        log.createdAt.toISOString(),
      ]);

      return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    }

    throw new BadRequestException(`Unsupported export format: ${format}`);
  }
}
