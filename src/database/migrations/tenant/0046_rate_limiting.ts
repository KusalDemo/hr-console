import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rate Limiting & API Throttling Migration
 * 
 * This migration creates:
 * - rate_limit_configs table for configurable rate limit rules
 * - Indexes for performance
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class RateLimiting0000000000046 implements MigrationInterface {
  name = 'RateLimiting0000000000046';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create rate_limit_configs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rate_limit_configs (
        id BIGSERIAL PRIMARY KEY,
        config_key VARCHAR(128) NOT NULL UNIQUE,
        config_name VARCHAR(255) NOT NULL,
        scope_type VARCHAR(32) NOT NULL,
        scope_id BIGINT,
        endpoint_pattern VARCHAR(512),
        limit_strategy VARCHAR(32) NOT NULL DEFAULT 'SLIDING_WINDOW',
        requests_per_minute INTEGER NOT NULL DEFAULT 60,
        requests_per_hour INTEGER,
        requests_per_day INTEGER,
        burst_size INTEGER,
        window_size_seconds INTEGER NOT NULL DEFAULT 60,
        is_active BOOLEAN NOT NULL DEFAULT true,
        priority INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by BIGINT,
        updated_by BIGINT
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rate_limit_configs_key 
      ON rate_limit_configs (config_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rate_limit_configs_scope 
      ON rate_limit_configs (scope_type, scope_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rate_limit_configs_active 
      ON rate_limit_configs (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rate_limit_configs_priority 
      ON rate_limit_configs (priority DESC)
    `);

    // Insert default global rate limit configuration
    await queryRunner.query(`
      INSERT INTO rate_limit_configs (
        config_key,
        config_name,
        scope_type,
        limit_strategy,
        requests_per_minute,
        window_size_seconds,
        is_active,
        priority,
        description
      ) VALUES (
        'global_default',
        'Global Default Rate Limit',
        'GLOBAL',
        'SLIDING_WINDOW',
        100,
        60,
        true,
        0,
        'Default rate limit for all requests: 100 requests per minute'
      )
      ON CONFLICT (config_key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_rate_limit_configs_priority
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_rate_limit_configs_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_rate_limit_configs_scope
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_rate_limit_configs_key
    `);

    // Drop table
    await queryRunner.query(`
      DROP TABLE IF EXISTS rate_limit_configs
    `);
  }
}
