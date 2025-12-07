import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditLogRepository } from '../repositories';

/**
 * Audit Retention Service
 *
 * Manages audit log retention policies:
 * - Automatic archival of old logs
 * - Deletion of logs past retention period
 * - Compliance with retention policies
 */
@Injectable()
export class AuditRetentionService {
  private readonly logger = new Logger(AuditRetentionService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * Archive audit logs older than retention period
   * Runs daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async archiveOldLogs(): Promise<void> {
    this.logger.log('Starting audit log archival process');

    try {
      // Default retention: 90 days before archival
      const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90', 10);

      const logsToArchive = await this.auditLogRepository.findEligibleForArchival(retentionDays);

      if (logsToArchive.length === 0) {
        this.logger.log('No audit logs eligible for archival');
        return;
      }

      const logIds = logsToArchive.map((log) => log.id);
      await this.auditLogRepository.archiveLogs(logIds, 0); // System user

      this.logger.log(`Archived ${logsToArchive.length} audit logs`);
    } catch (error) {
      this.logger.error(`Failed to archive audit logs: ${error instanceof Error ? error.message : String(error)}`, error);
    }
  }

  /**
   * Delete archived audit logs past retention period
   * Runs weekly on Sunday at 3 AM
   */
  @Cron('0 3 * * 0') // Every Sunday at 3 AM
  async deleteExpiredLogs(): Promise<void> {
    this.logger.log('Starting audit log deletion process');

    try {
      const logsToDelete = await this.auditLogRepository.findEligibleForDeletion();

      if (logsToDelete.length === 0) {
        this.logger.log('No audit logs eligible for deletion');
        return;
      }

      const logIds = logsToDelete.map((log) => log.id);
      await this.auditLogRepository.deleteArchivedLogs(logIds);

      this.logger.log(`Deleted ${logsToDelete.length} archived audit logs`);
    } catch (error) {
      this.logger.error(`Failed to delete audit logs: ${error instanceof Error ? error.message : String(error)}`, error);
    }
  }

  /**
   * Manually archive logs
   */
  async archiveLogsManually(logIds: number[], archivedBy: number): Promise<void> {
    await this.auditLogRepository.archiveLogs(logIds, archivedBy);
    this.logger.log(`Manually archived ${logIds.length} audit logs`);
  }

  /**
   * Set retention period for specific logs
   */
  async setRetentionPeriod(logIds: number[], retentionUntil: Date): Promise<void> {
    // This would require a custom update query
    // For now, we'll log the requirement
    this.logger.log(`Setting retention period for ${logIds.length} logs until ${retentionUntil}`);
    // TODO: Implement retention period update
  }

  /**
   * Get retention statistics
   */
  async getRetentionStatistics(): Promise<{
    total: number;
    archived: number;
    eligibleForArchival: number;
    eligibleForDeletion: number;
  }> {
    const retentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90', 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const [total, archived, eligibleForArchival] = await Promise.all([
      this.auditLogRepository.count({ where: { isArchived: false } }),
      this.auditLogRepository.count({ where: { isArchived: true } }),
      this.auditLogRepository.count({
        where: {
          isArchived: false,
          createdAt: LessThan(cutoffDate),
        },
      }),
    ]);

    const now = new Date();
    const eligibleForDeletion = await this.auditLogRepository.count({
      where: {
        isArchived: true,
        retentionUntil: LessThan(now),
      },
    });

    return {
      total,
      archived,
      eligibleForArchival,
      eligibleForDeletion,
    };
  }
}

// Import LessThan
import { LessThan } from 'typeorm';
