import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between } from 'typeorm';
import { IntegrationHealth, HealthStatus } from '../entities';

@Injectable()
export class IntegrationHealthRepository extends Repository<IntegrationHealth> {
  constructor(private dataSource: DataSource) {
    super(IntegrationHealth, dataSource.createEntityManager());
  }

  /**
   * Find health records for integration
   */
  async findByIntegration(
    integrationId: number,
    limit: number = 100,
  ): Promise<IntegrationHealth[]> {
    return this.find({
      where: { integrationId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find latest health record for integration
   */
  async findLatestByIntegration(integrationId: number): Promise<IntegrationHealth | null> {
    return this.findOne({
      where: { integrationId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find health records by status
   */
  async findByStatus(status: HealthStatus, limit: number = 100): Promise<IntegrationHealth[]> {
    return this.find({
      where: { status },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find health records by date range
   */
  async findByDateRange(
    integrationId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<IntegrationHealth[]> {
    return this.find({
      where: {
        integrationId,
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get health statistics for integration
   */
  async getHealthStatistics(
    integrationId: number,
    days: number = 7,
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
    statusBreakdown: Record<string, number>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = await this.findByDateRange(integrationId, startDate, new Date());

    const stats = {
      total: records.length,
      successful: 0,
      failed: 0,
      averageResponseTime: 0,
      statusBreakdown: {} as Record<string, number>,
    };

    let totalResponseTime = 0;
    let responseTimeCount = 0;

    records.forEach((record) => {
      if (record.isSuccessful) {
        stats.successful++;
      } else {
        stats.failed++;
      }

      stats.statusBreakdown[record.status] = (stats.statusBreakdown[record.status] || 0) + 1;

      if (record.responseTimeMs !== null) {
        totalResponseTime += record.responseTimeMs;
        responseTimeCount++;
      }
    });

    if (responseTimeCount > 0) {
      stats.averageResponseTime = totalResponseTime / responseTimeCount;
    }

    return stats;
  }
}
