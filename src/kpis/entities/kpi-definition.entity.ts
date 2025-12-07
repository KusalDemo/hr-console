import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { KPIMeasurement } from './kpi-measurement.entity';

/**
 * KPI Calculation Type Enum
 */
export enum KPICalculationType {
  SUM = 'SUM', // Sum of values
  AVERAGE = 'AVERAGE', // Average of values
  COUNT = 'COUNT', // Count of records
  MIN = 'MIN', // Minimum value
  MAX = 'MAX', // Maximum value
  PERCENTAGE = 'PERCENTAGE', // Percentage calculation
  FORMULA = 'FORMULA', // Custom formula
  CUSTOM = 'CUSTOM', // Custom calculation
}

/**
 * KPI Data Source Type Enum
 */
export enum KPIDataSourceType {
  DATABASE = 'DATABASE', // Database query
  API = 'API', // External API
  MANUAL = 'MANUAL', // Manual entry
  CALCULATED = 'CALCULATED', // Calculated from other KPIs
  GOAL = 'GOAL', // From goals/OKRs
}

/**
 * KPI Frequency Enum
 */
export enum KPIFrequency {
  REAL_TIME = 'REAL_TIME', // Real-time updates
  HOURLY = 'HOURLY', // Hourly
  DAILY = 'DAILY', // Daily
  WEEKLY = 'WEEKLY', // Weekly
  MONTHLY = 'MONTHLY', // Monthly
  QUARTERLY = 'QUARTERLY', // Quarterly
  YEARLY = 'YEARLY', // Yearly
}

/**
 * KPI Status Enum
 */
export enum KPIStatus {
  ACTIVE = 'ACTIVE', // Active KPI
  INACTIVE = 'INACTIVE', // Inactive KPI
  ARCHIVED = 'ARCHIVED', // Archived KPI
}

/**
 * KPI Definition Entity
 * 
 * Configurable KPIs and metric definitions with:
 * - Calculation formulas
 * - Data sources
 * - KPI dashboards
 * - Alerts and thresholds
 * - Integration with goals for automated updates
 */
@Entity('kpi_definitions')
@Index('idx_kpi_definitions_organization', ['organizationId'])
@Index('idx_kpi_definitions_category', ['category'])
@Index('idx_kpi_definitions_status', ['status'])
@Index('idx_kpi_definitions_frequency', ['calculationFrequency'])
@Index('idx_kpi_definitions_active', ['isActive'])
export class KPIDefinition {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * KPI name
   */
  @Column({ name: 'kpi_name', type: 'varchar', length: 255, nullable: false })
  kpiName: string;

  /**
   * KPI description
   */
  @Column({ name: 'kpi_description', type: 'text', nullable: true })
  kpiDescription: string | null;

  /**
   * KPI category
   */
  @Column({ name: 'category', type: 'varchar', length: 128, nullable: true })
  category: string | null;

  /**
   * Organization ID
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  /**
   * Department ID (if department-specific)
   */
  @Column({ name: 'department_id', type: 'bigint', nullable: true })
  departmentId: number | null;

  /**
   * Team ID (if team-specific)
   */
  @Column({ name: 'team_id', type: 'bigint', nullable: true })
  teamId: number | null;

  /**
   * Calculation type
   */
  @Column({
    name: 'calculation_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: KPICalculationType.AVERAGE,
  })
  calculationType: KPICalculationType;

  /**
   * Data source type
   */
  @Column({
    name: 'data_source_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: KPIDataSourceType.DATABASE,
  })
  dataSourceType: KPIDataSourceType;

  /**
   * Data source configuration (JSON: query, API endpoint, etc.)
   */
  @Column({ name: 'data_source_config', type: 'jsonb', nullable: true })
  dataSourceConfig: Record<string, any> | null;

  /**
   * Calculation formula (for FORMULA type)
   */
  @Column({ name: 'calculation_formula', type: 'text', nullable: true })
  calculationFormula: string | null;

  /**
   * Unit of measurement (e.g., "%", "users", "$", "hours")
   */
  @Column({ name: 'unit', type: 'varchar', length: 32, nullable: true })
  unit: string | null;

  /**
   * Calculation frequency
   */
  @Column({
    name: 'calculation_frequency',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: KPIFrequency.DAILY,
  })
  calculationFrequency: KPIFrequency;

  /**
   * Target value
   */
  @Column({ name: 'target_value', type: 'decimal', precision: 15, scale: 2, nullable: true })
  targetValue: number | null;

  /**
   * Minimum threshold (alert if below)
   */
  @Column({ name: 'min_threshold', type: 'decimal', precision: 15, scale: 2, nullable: true })
  minThreshold: number | null;

  /**
   * Maximum threshold (alert if above)
   */
  @Column({ name: 'max_threshold', type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxThreshold: number | null;

  /**
   * Alert configuration (JSON: enabled, recipients, channels)
   */
  @Column({ name: 'alert_config', type: 'jsonb', nullable: true })
  alertConfig: Record<string, any> | null;

  /**
   * Goal ID (if linked to a goal for automated updates)
   */
  @Column({ name: 'goal_id', type: 'bigint', nullable: true })
  goalId: number | null;

  /**
   * Key result ID (if linked to a key result)
   */
  @Column({ name: 'key_result_id', type: 'bigint', nullable: true })
  keyResultId: number | null;

  /**
   * KPI status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: KPIStatus.ACTIVE,
  })
  status: KPIStatus;

  /**
   * Whether KPI is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Last calculated date
   */
  @Column({ name: 'last_calculated_at', type: 'timestamptz', nullable: true })
  lastCalculatedAt: Date | null;

  /**
   * Next calculation date
   */
  @Column({ name: 'next_calculation_at', type: 'timestamptz', nullable: true })
  nextCalculationAt: Date | null;

  /**
   * KPI metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'kpi_metadata', type: 'jsonb', nullable: true })
  kpiMetadata: Record<string, any> | null;

  /**
   * KPI measurements (time-series values)
   */
  @OneToMany(() => KPIMeasurement, (measurement) => measurement.kpiDefinition, {
    cascade: false,
    lazy: true,
  })
  measurements: Promise<KPIMeasurement[]> | KPIMeasurement[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
