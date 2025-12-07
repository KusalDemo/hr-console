import { Injectable } from '@nestjs/common';
import { DataSource, Repository, LessThan, In } from 'typeorm';
import { AuditLog, AuditLevel, ActivityCategory } from '../entities/audit-log.entity';

/**
 * Audit Log Repository
 * Provides custom queries for audit log operations
 */
@Injectable()
export class AuditLogRepository extends Repository<AuditLog> {
  constructor(private dataSource: DataSource) {
    super(AuditLog, dataSource.createEntityManager());
  }

  /**
   * Find audit log by ID
   */
  async findById(id: number): Promise<AuditLog | null> {
    return this.findOne({
      where: { id },
    });
  }

  /**
   * Find audit logs by actor
   */
  async findByActor(actorType: string, actorId: number, limit?: number): Promise<AuditLog[]> {
    const query = this.createQueryBuilder('log')
      .where('log.actorType = :actorType', { actorType })
      .andWhere('log.actorId = :actorId', { actorId })
      .orderBy('log.createdAt', 'DESC');

    if (limit) {
      query.take(limit);
    }

    return query.getMany();
  }

  /**
   * Find audit logs by target entity
   */
  async findByTarget(targetType: string, targetId: number, limit?: number): Promise<AuditLog[]> {
    const query = this.createQueryBuilder('log')
      .where('log.targetType = :targetType', { targetType })
      .andWhere('log.targetId = :targetId', { targetId })
      .orderBy('log.createdAt', 'DESC');

    if (limit) {
      query.take(limit);
    }

    return query.getMany();
  }

  /**
   * Find audit logs with pagination and filters
   */
  async findWithPagination(
    page: number,
    limit: number,
    filters?: {
      activityType?: string;
      activityCategory?: ActivityCategory;
      actorType?: string;
      actorId?: number;
      targetType?: string;
      targetId?: number;
      organizationId?: number;
      auditLevel?: AuditLevel;
      startDate?: Date;
      endDate?: Date;
      isArchived?: boolean;
      complianceTags?: string[];
    },
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const query = this.createQueryBuilder('log');

    if (filters?.activityType) {
      query.andWhere('log.activityType = :activityType', {
        activityType: filters.activityType,
      });
    }

    if (filters?.activityCategory) {
      query.andWhere('log.activityCategory = :activityCategory', {
        activityCategory: filters.activityCategory,
      });
    }

    if (filters?.actorType) {
      query.andWhere('log.actorType = :actorType', { actorType: filters.actorType });
    }

    if (filters?.actorId !== undefined) {
      query.andWhere('log.actorId = :actorId', { actorId: filters.actorId });
    }

    if (filters?.targetType) {
      query.andWhere('log.targetType = :targetType', { targetType: filters.targetType });
    }

    if (filters?.targetId !== undefined) {
      query.andWhere('log.targetId = :targetId', { targetId: filters.targetId });
    }

    if (filters?.organizationId !== undefined) {
      query.andWhere('log.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    if (filters?.auditLevel) {
      query.andWhere('log.auditLevel = :auditLevel', { auditLevel: filters.auditLevel });
    }

    if (filters?.startDate && filters?.endDate) {
      query.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters?.startDate) {
      query.andWhere('log.createdAt >= :startDate', { startDate: filters.startDate });
    } else if (filters?.endDate) {
      query.andWhere('log.createdAt <= :endDate', { endDate: filters.endDate });
    }

    if (filters?.isArchived !== undefined) {
      query.andWhere('log.isArchived = :isArchived', { isArchived: filters.isArchived });
    }

    if (filters?.complianceTags && filters.complianceTags.length > 0) {
      query.andWhere('log.complianceTags && :complianceTags', {
        complianceTags: filters.complianceTags,
      });
    }

    query
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [logs, total] = await query.getManyAndCount();

    return { logs, total };
  }

  /**
   * Find audit logs eligible for archival
   */
  async findEligibleForArchival(retentionDays: number): Promise<AuditLog[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return this.find({
      where: {
        isArchived: false,
        createdAt: LessThan(cutoffDate),
      },
      order: {
        createdAt: 'ASC',
      },
      take: 1000, // Process in batches
    });
  }

  /**
   * Find audit logs eligible for deletion
   */
  async findEligibleForDeletion(): Promise<AuditLog[]> {
    const now = new Date();

    return this.find({
      where: {
        isArchived: true,
        retentionUntil: LessThan(now),
      },
      order: {
        retentionUntil: 'ASC',
      },
      take: 1000, // Process in batches
    });
  }

  /**
   * Archive audit logs
   */
  async archiveLogs(logIds: number[], archivedBy: number): Promise<void> {
    await this.update(
      { id: In(logIds) },
      {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy,
      },
    );
  }

  /**
   * Delete archived audit logs
   */
  async deleteArchivedLogs(logIds: number[]): Promise<void> {
    await this.delete({ id: In(logIds) });
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
    const query = this.createQueryBuilder('log');

    if (organizationId !== undefined) {
      query.andWhere('log.organizationId = :organizationId', { organizationId });
    }

    if (startDate && endDate) {
      query.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const logs = await query.getMany();

    const stats = {
      total: logs.length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byActivityType: {} as Record<string, number>,
    };

    logs.forEach((log) => {
      // Count by level
      stats.byLevel[log.auditLevel] = (stats.byLevel[log.auditLevel] || 0) + 1;

      // Count by category
      if (log.activityCategory) {
        stats.byCategory[log.activityCategory] = (stats.byCategory[log.activityCategory] || 0) + 1;
      }

      // Count by activity type
      stats.byActivityType[log.activityType] = (stats.byActivityType[log.activityType] || 0) + 1;
    });

    return stats;
  }

  /**
   * Full-text search audit logs
   */
  async searchAuditLogs(
    searchTerm: string,
    page: number,
    limit: number,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const query = this.createQueryBuilder('log')
      .where(
        `(log.description ILIKE :searchTerm 
         OR log.actorName ILIKE :searchTerm 
         OR log.targetName ILIKE :searchTerm 
         OR log.activityType ILIKE :searchTerm)`,
        { searchTerm: `%${searchTerm}%` },
      )
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [logs, total] = await query.getManyAndCount();

    return { logs, total };
  }
}
