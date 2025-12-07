import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { KPIDefinition } from './kpi-definition.entity';

/**
 * KPI Measurement Entity
 *
 * Time-series KPI values for tracking KPI measurements over time.
 */
@Entity('kpi_measurements')
@Index('idx_kpi_measurements_kpi', ['kpiDefinitionId'])
@Index('idx_kpi_measurements_date', ['measurementDate'])
@Index('idx_kpi_measurements_period', ['kpiDefinitionId', 'measurementDate'])
export class KPIMeasurement {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Reference to KPI definition
   */
  @Column({ name: 'kpi_definition_id', type: 'bigint', nullable: false })
  kpiDefinitionId: number;

  /**
   * KPI definition relationship
   */
  @ManyToOne(() => KPIDefinition, (kpi) => kpi.measurements, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'kpi_definition_id' })
  kpiDefinition: KPIDefinition;

  /**
   * Measurement date
   */
  @Column({ name: 'measurement_date', type: 'date', nullable: false })
  measurementDate: Date;

  /**
   * Measurement timestamp (for real-time KPIs)
   */
  @Column({ name: 'measurement_timestamp', type: 'timestamptz', nullable: true })
  measurementTimestamp: Date | null;

  /**
   * Measured value
   */
  @Column({ name: 'value', type: 'decimal', precision: 15, scale: 2, nullable: false })
  value: number;

  /**
   * Target value at time of measurement
   */
  @Column({ name: 'target_value', type: 'decimal', precision: 15, scale: 2, nullable: true })
  targetValue: number | null;

  /**
   * Percentage of target achieved
   */
  @Column({
    name: 'target_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  targetPercentage: number | null;

  /**
   * Whether measurement triggered an alert
   */
  @Column({ name: 'triggered_alert', type: 'boolean', nullable: false, default: false })
  triggeredAlert: boolean;

  /**
   * Alert details (JSON: type, threshold, message)
   */
  @Column({ name: 'alert_details', type: 'jsonb', nullable: true })
  alertDetails: Record<string, any> | null;

  /**
   * Raw data used for calculation (JSON: for debugging/audit)
   */
  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData: Record<string, any> | null;

  /**
   * Measurement metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'measurement_metadata', type: 'jsonb', nullable: true })
  measurementMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
