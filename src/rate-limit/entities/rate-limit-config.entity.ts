import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Rate Limit Scope Type Enum
 */
export enum RateLimitScopeType {
  GLOBAL = 'GLOBAL', // Global rate limit (applies to all)
  TENANT = 'TENANT', // Tenant-specific rate limit
  USER = 'USER', // User-specific rate limit
  ENDPOINT = 'ENDPOINT', // Endpoint-specific rate limit
}

/**
 * Rate Limit Strategy Enum
 */
export enum RateLimitStrategy {
  TOKEN_BUCKET = 'TOKEN_BUCKET', // Token bucket algorithm
  SLIDING_WINDOW = 'SLIDING_WINDOW', // Sliding window algorithm
}

/**
 * Rate Limit Config Entity
 *
 * Configurable rate limit rules for:
 * - Global limits
 * - Per-tenant limits
 * - Per-user limits
 * - Per-endpoint limits
 *
 * Supports multiple strategies (token bucket, sliding window)
 * and tiered limits (per minute, hour, day)
 */
@Entity('rate_limit_configs')
@Index('idx_rate_limit_configs_key', ['configKey'], { unique: true })
@Index('idx_rate_limit_configs_scope', ['scopeType', 'scopeId'])
@Index('idx_rate_limit_configs_active', ['isActive'])
@Index('idx_rate_limit_configs_priority', ['priority'])
export class RateLimitConfig {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique configuration key
   */
  @Column({ name: 'config_key', type: 'varchar', length: 128, unique: true, nullable: false })
  configKey: string;

  /**
   * Configuration name
   */
  @Column({ name: 'config_name', type: 'varchar', length: 255, nullable: false })
  configName: string;

  /**
   * Scope type (GLOBAL, TENANT, USER, ENDPOINT)
   */
  @Column({
    name: 'scope_type',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  scopeType: RateLimitScopeType;

  /**
   * Scope ID (tenant ID, user ID, etc.)
   */
  @Column({ name: 'scope_id', type: 'bigint', nullable: true })
  scopeId: number | null;

  /**
   * Endpoint pattern (e.g., "/api/employees/*", "POST:/api/employees")
   */
  @Column({ name: 'endpoint_pattern', type: 'varchar', length: 512, nullable: true })
  endpointPattern: string | null;

  /**
   * Rate limit strategy
   */
  @Column({
    name: 'limit_strategy',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: RateLimitStrategy.SLIDING_WINDOW,
  })
  limitStrategy: RateLimitStrategy;

  /**
   * Requests per minute
   */
  @Column({ name: 'requests_per_minute', type: 'integer', nullable: false, default: 60 })
  requestsPerMinute: number;

  /**
   * Requests per hour
   */
  @Column({ name: 'requests_per_hour', type: 'integer', nullable: true })
  requestsPerHour: number | null;

  /**
   * Requests per day
   */
  @Column({ name: 'requests_per_day', type: 'integer', nullable: true })
  requestsPerDay: number | null;

  /**
   * Burst size (for token bucket strategy)
   */
  @Column({ name: 'burst_size', type: 'integer', nullable: true })
  burstSize: number | null;

  /**
   * Window size in seconds (for sliding window strategy)
   */
  @Column({ name: 'window_size_seconds', type: 'integer', nullable: false, default: 60 })
  windowSizeSeconds: number;

  /**
   * Whether configuration is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Priority (higher = more specific, applied first)
   */
  @Column({ type: 'integer', nullable: false, default: 0 })
  priority: number;

  /**
   * Description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Additional metadata (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
