import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { KPIDefinitionRepository } from '../repositories/kpi-definition.repository';
import { KPIMeasurementRepository } from '../repositories/kpi-measurement.repository';
import {
  KPIDefinition,
  KPICalculationType,
  KPIDataSourceType,
  KPIFrequency,
  KPIStatus,
} from '../entities/kpi-definition.entity';
import { KPIMeasurement } from '../entities/kpi-measurement.entity';

/**
 * KPI Service
 * 
 * Manages KPIs with:
 * - KPI CRUD operations
 * - KPI dashboards
 * - Alerts and thresholds
 * - Integration with goals for automated updates
 */
@Injectable()
export class KPIService {
  private readonly logger = new Logger(KPIService.name);

  constructor(
    private readonly kpiDefinitionRepository: KPIDefinitionRepository,
    private readonly kpiMeasurementRepository: KPIMeasurementRepository,
  ) {}

  /**
   * Create a new KPI definition
   */
  async createKPIDefinition(createDto: any, createdBy?: number): Promise<KPIDefinition> {
    const kpi = this.kpiDefinitionRepository.create({
      ...createDto,
      calculationType: createDto.calculationType || KPICalculationType.AVERAGE,
      dataSourceType: createDto.dataSourceType || KPIDataSourceType.DATABASE,
      calculationFrequency: createDto.calculationFrequency || KPIFrequency.DAILY,
      status: createDto.status || KPIStatus.ACTIVE,
      isActive: true,
      createdBy,
    });

    // Calculate next calculation date based on frequency
    if (kpi.calculationFrequency !== KPIFrequency.REAL_TIME) {
      kpi.nextCalculationAt = this.calculateNextCalculationDate(kpi.calculationFrequency);
    }

    const saved = await this.kpiDefinitionRepository.save(kpi);

    this.logger.log(`Created KPI definition: ${saved.id} (${saved.kpiName})`);

    return saved;
  }

  /**
   * Get KPI definition by ID
   */
  async getKPIDefinitionById(
    id: number,
    includeMeasurements = false,
  ): Promise<KPIDefinition> {
    const kpi = await this.kpiDefinitionRepository.findById(id, includeMeasurements);

    if (!kpi) {
      throw new NotFoundException(`KPI definition with ID ${id} not found`);
    }

    return kpi;
  }

  /**
   * Update KPI definition
   */
  async updateKPIDefinition(
    id: number,
    updateDto: any,
    updatedBy?: number,
  ): Promise<KPIDefinition> {
    const kpi = await this.kpiDefinitionRepository.findById(id);

    if (!kpi) {
      throw new NotFoundException(`KPI definition with ID ${id} not found`);
    }

    Object.assign(kpi, {
      ...updateDto,
      updatedBy,
    });

    // Recalculate next calculation date if frequency changed
    if (updateDto.calculationFrequency && kpi.calculationFrequency !== KPIFrequency.REAL_TIME) {
      kpi.nextCalculationAt = this.calculateNextCalculationDate(kpi.calculationFrequency);
    }

    const saved = await this.kpiDefinitionRepository.save(kpi);

    this.logger.log(`Updated KPI definition: ${id}`);

    return saved;
  }

  /**
   * Delete KPI definition (soft delete by setting inactive)
   */
  async deleteKPIDefinition(id: number, updatedBy?: number): Promise<void> {
    const kpi = await this.kpiDefinitionRepository.findById(id);

    if (!kpi) {
      throw new NotFoundException(`KPI definition with ID ${id} not found`);
    }

    kpi.isActive = false;
    kpi.status = KPIStatus.ARCHIVED;
    kpi.updatedBy = updatedBy;

    await this.kpiDefinitionRepository.save(kpi);

    this.logger.log(`Archived KPI definition: ${id}`);
  }

  /**
   * Get KPIs by organization
   */
  async getKPIsByOrganization(
    organizationId: number,
    includeInactive = false,
  ): Promise<KPIDefinition[]> {
    return this.kpiDefinitionRepository.findByOrganization(organizationId, includeInactive);
  }

  /**
   * Get KPIs by category
   */
  async getKPIsByCategory(
    category: string,
    organizationId?: number,
  ): Promise<KPIDefinition[]> {
    return this.kpiDefinitionRepository.findByCategory(category, organizationId);
  }

  /**
   * Get KPIs needing calculation
   */
  async getKPIsNeedingCalculation(
    organizationId?: number,
    beforeDate?: Date,
  ): Promise<KPIDefinition[]> {
    return this.kpiDefinitionRepository.findNeedingCalculation(organizationId, beforeDate);
  }

  /**
   * Get KPIs linked to goal
   */
  async getKPIsByGoal(goalId: number): Promise<KPIDefinition[]> {
    return this.kpiDefinitionRepository.findByGoal(goalId);
  }

  /**
   * Get KPIs linked to key result
   */
  async getKPIsByKeyResult(keyResultId: number): Promise<KPIDefinition[]> {
    return this.kpiDefinitionRepository.findByKeyResult(keyResultId);
  }

  /**
   * Search KPIs
   */
  async searchKPIs(filters: {
    searchTerm?: string;
    category?: string;
    calculationType?: KPICalculationType;
    organizationId?: number;
    includeInactive?: boolean;
  }): Promise<KPIDefinition[]> {
    return this.kpiDefinitionRepository.searchKPIs(
      filters.searchTerm,
      filters.category,
      filters.calculationType,
      filters.organizationId,
      filters.includeInactive,
    );
  }

  /**
   * Get latest measurement for KPI
   */
  async getLatestMeasurement(kpiDefinitionId: number): Promise<KPIMeasurement | null> {
    return this.kpiMeasurementRepository.findLatest(kpiDefinitionId);
  }

  /**
   * Get measurements for KPI
   */
  async getMeasurements(
    kpiDefinitionId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<KPIMeasurement[]> {
    return this.kpiMeasurementRepository.findByKPI(kpiDefinitionId, startDate, endDate);
  }

  /**
   * Get measurement statistics
   */
  async getMeasurementStatistics(
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
    return this.kpiMeasurementRepository.getStatistics(kpiDefinitionId, startDate, endDate);
  }

  /**
   * Calculate next calculation date based on frequency
   */
  private calculateNextCalculationDate(frequency: KPIFrequency): Date {
    const nextDate = new Date();

    switch (frequency) {
      case KPIFrequency.HOURLY:
        nextDate.setHours(nextDate.getHours() + 1);
        break;
      case KPIFrequency.DAILY:
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case KPIFrequency.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case KPIFrequency.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case KPIFrequency.QUARTERLY:
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case KPIFrequency.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
  }
}
