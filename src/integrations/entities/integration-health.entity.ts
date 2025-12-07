import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Integration } from './integration.entity';

/**
 * Health Status Enum
 */
export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  DOWN = 'DOWN',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Integration Health Entity
 * 
 * Tracks integration health status over time:
 * - Health check results
 * - Response times
 * - Error rates
 * - Availability metrics
 */
@Entity('integration_health')
@Index('idx_integration_health_integration', ['integrationId'])
@Index('idx_integration_health_status', ['status'])
@Index('idx_integration_health_created', ['createdAt'])
export class IntegrationHealth {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Integration this health record belongs to
   */
  @ManyToOne(() => Integration, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'integration_id' })
  integration: Promise<Integration> | Integration;

  @Column({ name: 'integration_id', type: 'bigint', nullable: false })
  integrationId: number;

  /**
   * Health status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  status: HealthStatus;

  /**
   * Response time in milliseconds
   */
  @Column({ name: 'response_time_ms', type: 'integer', nullable: true })
  responseTimeMs: number | null;

  /**
   * HTTP status code (if applicable)
   */
  @Column({ name: 'http_status_code', type: 'integer', nullable: true })
  httpStatusCode: number | null;

  /**
   * Error message (if any)
   */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  /**
   * Health check details (JSON)
   */
  @Column({ name: 'check_details', type: 'jsonb', nullable: true })
  checkDetails: Record<string, any> | null;

  /**
   * Whether check was successful
   */
  @Column({ name: 'is_successful', type: 'boolean', nullable: false, default: true })
  isSuccessful: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;
}
