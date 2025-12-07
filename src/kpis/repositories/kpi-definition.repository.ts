import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { KPIDefinition, KPICalculationType, KPIStatus } from '../entities/kpi-definition.entity';

/**
 * KPI Definition Repository
 * 
 * Custom repository methods for KPI definition queries.
 */
@Injectable()
export class KPIDefinitionRepository extends Repository<KPIDefinition> {
  constructor(private dataSource: DataSource) {
    super(KPIDefinition, dataSource.createEntityManager());
  }

  /**
   * Find KPI definition by ID
   */
  async findById(id: number, includeMeasurements = false): Promise<KPIDefinition | null> {
    const query = this.createQueryBuilder('kpi').where('kpi.id = :id', { id });

    if (includeMeasurements) {
      query.leftJoinAndSelect('kpi.measurements', 'measurements');
    }

    return query.getOne();
  }

  /**
   * Find KPIs by organization
   */
  async findByOrganization(
    organizationId: number,
    includeInactive = false,
  ): Promise<KPIDefinition[]> {
    const query = this.createQueryBuilder('kpi')
      .where('kpi.organizationId = :organizationId', { organizationId })
      .orderBy('kpi.kpiName', 'ASC');

    if (!includeInactive) {
      query.andWhere('kpi.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }

  /**
   * Find KPIs by category
   */
  async findByCategory(
    category: string,
    organizationId?: number,
  ): Promise<KPIDefinition[]> {
    const query = this.createQueryBuilder('kpi')
      .where('kpi.category = :category', { category })
      .andWhere('kpi.isActive = :isActive', { isActive: true })
      .orderBy('kpi.kpiName', 'ASC');

    if (organizationId) {
      query.andWhere('kpi.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find KPIs by status
   */
  async findByStatus(
    status: KPIStatus,
    organizationId?: number,
  ): Promise<KPIDefinition[]> {
    const query = this.createQueryBuilder('kpi')
      .where('kpi.status = :status', { status })
      .orderBy('kpi.kpiName', 'ASC');

    if (organizationId) {
      query.andWhere('kpi.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find KPIs by calculation frequency
   */
  async findByFrequency(
    frequency: string,
    organizationId?: number,
  ): Promise<KPIDefinition[]> {
    const query = this.createQueryBuilder('kpi')
      .where('kpi.calculationFrequency = :frequency', { frequency })
      .andWhere('kpi.isActive = :isActive', { isActive: true })
      .orderBy('kpi.kpiName', 'ASC');

    if (organizationId) {
      query.andWhere('kpi.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find KPIs needing calculation
   */
  async findNeedingCalculation(
    organizationId?: number,
    beforeDate?: Date,
  ): Promise<KPIDefinition[]> {
    const calculationDate = beforeDate || new Date();
    const query = this.createQueryBuilder('kpi')
      .where('kpi.status = :status', { status: KPIStatus.ACTIVE })
      .andWhere('kpi.isActive = :isActive', { isActive: true })
      .andWhere(
        '(kpi.nextCalculationAt IS NULL OR kpi.nextCalculationAt <= :calculationDate)',
        { calculationDate },
      )
      .orderBy('kpi.nextCalculationAt', 'ASC')
      .addOrderBy('kpi.kpiName', 'ASC');

    if (organizationId) {
      query.andWhere('kpi.organizationId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  /**
   * Find KPIs linked to goal
   */
  async findByGoal(goalId: number): Promise<KPIDefinition[]> {
    return this.createQueryBuilder('kpi')
      .where('kpi.goalId = :goalId', { goalId })
      .andWhere('kpi.isActive = :isActive', { isActive: true })
      .orderBy('kpi.kpiName', 'ASC')
      .getMany();
  }

  /**
   * Find KPIs linked to key result
   */
  async findByKeyResult(keyResultId: number): Promise<KPIDefinition[]> {
    return this.createQueryBuilder('kpi')
      .where('kpi.keyResultId = :keyResultId', { keyResultId })
      .andWhere('kpi.isActive = :isActive', { isActive: true })
      .orderBy('kpi.kpiName', 'ASC')
      .getMany();
  }

  /**
   * Search KPIs
   */
  async searchKPIs(
    searchTerm?: string,
    category?: string,
    calculationType?: KPICalculationType,
    organizationId?: number,
    includeInactive = false,
  ): Promise<KPIDefinition[]> {
    const query = this.createQueryBuilder('kpi')
      .orderBy('kpi.kpiName', 'ASC');

    if (searchTerm) {
      query.andWhere(
        `(
          kpi.kpiName ILIKE :searchTerm OR
          kpi.kpiDescription ILIKE :searchTerm
        )`,
        { searchTerm: `%${searchTerm}%` },
      );
    }

    if (category) {
      query.andWhere('kpi.category = :category', { category });
    }

    if (calculationType) {
      query.andWhere('kpi.calculationType = :calculationType', { calculationType });
    }

    if (organizationId) {
      query.andWhere('kpi.organizationId = :organizationId', { organizationId });
    }

    if (!includeInactive) {
      query.andWhere('kpi.isActive = :isActive', { isActive: true });
    }

    return query.getMany();
  }
}
