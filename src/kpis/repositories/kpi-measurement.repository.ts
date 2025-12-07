import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between } from 'typeorm';
import { KPIMeasurement } from '../entities/kpi-measurement.entity';

/**
 * KPI Measurement Repository
 * 
 * Custom repository methods for KPI measurement queries with optimized time-series queries.
 */
@Injectable()
export class KPIMeasurementRepository extends Repository<KPIMeasurement> {
  constructor(private dataSource: DataSource) {
    super(KPIMeasurement, dataSource.createEntityManager());
  }

  /**
   * Find measurement by ID
   */
  async findById(id: number, includeKPI = false): Promise<KPIMeasurement | null> {
    const query = this.createQueryBuilder('measurement').where('measurement.id = :id', { id });

    if (includeKPI) {
      query.leftJoinAndSelect('measurement.kpiDefinition', 'kpiDefinition');
    }

    return query.getOne();
  }

  /**
   * Find measurements by KPI definition
   */
  async findByKPI(
    kpiDefinitionId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<KPIMeasurement[]> {
    const query = this.createQueryBuilder('measurement')
      .where('measurement.kpiDefinitionId = :kpiDefinitionId', { kpiDefinitionId })
      .orderBy('measurement.measurementDate', 'ASC')
      .addOrderBy('measurement.measurementTimestamp', 'ASC');

    if (startDate) {
      query.andWhere('measurement.measurementDate >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('measurement.measurementDate <= :endDate', { endDate });
    }

    return query.getMany();
  }

  /**
   * Find latest measurement for KPI
   */
  async findLatest(kpiDefinitionId: number): Promise<KPIMeasurement | null> {
    return this.createQueryBuilder('measurement')
      .where('measurement.kpiDefinitionId = :kpiDefinitionId', { kpiDefinitionId })
      .orderBy('measurement.measurementDate', 'DESC')
      .addOrderBy('measurement.measurementTimestamp', 'DESC')
      .limit(1)
      .getOne();
  }

  /**
   * Find measurements in date range (raw SQL for performance)
   */
  async findInDateRange(
    kpiDefinitionId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<KPIMeasurement[]> {
    return this.query(
      `
      SELECT *
      FROM kpi_measurements
      WHERE kpi_definition_id = $1
        AND measurement_date >= $2
        AND measurement_date <= $3
      ORDER BY measurement_date ASC, measurement_timestamp ASC
    `,
      [kpiDefinitionId, startDate, endDate],
    );
  }

  /**
   * Get measurement statistics
   */
  async getStatistics(
    kpiDefinitionId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    count: number;
    min: number;
    max: number;
    avg: number;
    sum: number;
    latest: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }> {
    const result = await this.createQueryBuilder('measurement')
      .select('COUNT(*)', 'count')
      .addSelect('MIN(measurement.value)', 'min')
      .addSelect('MAX(measurement.value)', 'max')
      .addSelect('AVG(measurement.value)', 'avg')
      .addSelect('SUM(measurement.value)', 'sum')
      .where('measurement.kpiDefinitionId = :kpiDefinitionId', { kpiDefinitionId })
      .andWhere('measurement.measurementDate >= :startDate', { startDate })
      .andWhere('measurement.measurementDate <= :endDate', { endDate })
      .getRawOne();

    // Get first and last values for trend calculation
    const firstMeasurement = await this.createQueryBuilder('measurement')
      .where('measurement.kpiDefinitionId = :kpiDefinitionId', { kpiDefinitionId })
      .andWhere('measurement.measurementDate >= :startDate', { startDate })
      .andWhere('measurement.measurementDate <= :endDate', { endDate })
      .orderBy('measurement.measurementDate', 'ASC')
      .limit(1)
      .getOne();

    const lastMeasurement = await this.createQueryBuilder('measurement')
      .where('measurement.kpiDefinitionId = :kpiDefinitionId', { kpiDefinitionId })
      .andWhere('measurement.measurementDate >= :startDate', { startDate })
      .andWhere('measurement.measurementDate <= :endDate', { endDate })
      .orderBy('measurement.measurementDate', 'DESC')
      .limit(1)
      .getOne();

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (firstMeasurement && lastMeasurement) {
      const firstValue = parseFloat(firstMeasurement.value.toString());
      const lastValue = parseFloat(lastMeasurement.value.toString());
      const change = ((lastValue - firstValue) / firstValue) * 100;

      if (change > 5) {
        trend = 'increasing';
      } else if (change < -5) {
        trend = 'decreasing';
      }
    }

    return {
      count: parseInt(result.count) || 0,
      min: parseFloat(result.min) || 0,
      max: parseFloat(result.max) || 0,
      avg: parseFloat(result.avg) || 0,
      sum: parseFloat(result.sum) || 0,
      latest: lastMeasurement ? parseFloat(lastMeasurement.value.toString()) : 0,
      trend,
    };
  }

  /**
   * Get measurements with alerts
   */
  async findWithAlerts(
    kpiDefinitionId?: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<KPIMeasurement[]> {
    const query = this.createQueryBuilder('measurement')
      .where('measurement.triggeredAlert = :triggeredAlert', { triggeredAlert: true })
      .orderBy('measurement.measurementDate', 'DESC');

    if (kpiDefinitionId) {
      query.andWhere('measurement.kpiDefinitionId = :kpiDefinitionId', { kpiDefinitionId });
    }

    if (startDate) {
      query.andWhere('measurement.measurementDate >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('measurement.measurementDate <= :endDate', { endDate });
    }

    return query.getMany();
  }

  /**
   * Aggregate measurements by period (for forecasting)
   */
  async aggregateByPeriod(
    kpiDefinitionId: number,
    startDate: Date,
    endDate: Date,
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
  ): Promise<Array<{ period: string; value: number; count: number }>> {
    let dateFormat: string;
    switch (period) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'IYYY-IW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      case 'quarter':
        dateFormat = 'YYYY-Q';
        break;
      case 'year':
        dateFormat = 'YYYY';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }

    return this.query(
      `
      SELECT 
        TO_CHAR(measurement_date, $1) as period,
        AVG(value) as value,
        COUNT(*) as count
      FROM kpi_measurements
      WHERE kpi_definition_id = $2
        AND measurement_date >= $3
        AND measurement_date <= $4
      GROUP BY period
      ORDER BY period ASC
    `,
      [dateFormat, kpiDefinitionId, startDate, endDate],
    );
  }
}
