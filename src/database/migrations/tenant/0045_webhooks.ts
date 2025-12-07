import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Webhook Event System Migration
 *
 * This migration creates:
 * - webhook_subscriptions table for webhook subscription configurations
 * - webhook_events table for webhook event tracking and delivery
 * - Indexes for performance
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Webhooks0000000000045 implements MigrationInterface {
  name = 'Webhooks0000000000045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create webhook_subscriptions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS webhook_subscriptions (
        id BIGSERIAL PRIMARY KEY,
        subscription_key VARCHAR(128) NOT NULL UNIQUE,
        subscription_name VARCHAR(255) NOT NULL,
        description TEXT,
        organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        webhook_url VARCHAR(512) NOT NULL,
        event_types JSONB NOT NULL,
        event_filters JSONB,
        http_method VARCHAR(10) NOT NULL DEFAULT 'POST',
        custom_headers JSONB,
        secret_key VARCHAR(255),
        max_retries INTEGER NOT NULL DEFAULT 3,
        retry_delay_seconds INTEGER NOT NULL DEFAULT 60,
        timeout_ms INTEGER NOT NULL DEFAULT 30000,
        is_active BOOLEAN NOT NULL DEFAULT true,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        last_success_at TIMESTAMPTZ,
        last_failure_at TIMESTAMPTZ,
        last_failure_reason TEXT,
        success_count BIGINT NOT NULL DEFAULT 0,
        failure_count BIGINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by BIGINT,
        updated_by BIGINT
      )
    `);

    // Create indexes for webhook_subscriptions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_organization 
      ON webhook_subscriptions (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_status 
      ON webhook_subscriptions (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active 
      ON webhook_subscriptions (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_key 
      ON webhook_subscriptions (subscription_key)
    `);

    // Create webhook_events table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id BIGSERIAL PRIMARY KEY,
        subscription_id BIGINT NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
        event_type VARCHAR(128) NOT NULL,
        payload JSONB NOT NULL,
        metadata JSONB,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        attempt_count INTEGER NOT NULL DEFAULT 0,
        next_retry_at TIMESTAMPTZ,
        last_attempt_at TIMESTAMPTZ,
        last_response_status INTEGER,
        last_response_body TEXT,
        last_error TEXT,
        delivered_at TIMESTAMPTZ,
        request_id VARCHAR(128),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Create indexes for webhook_events
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_subscription 
      ON webhook_events (subscription_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_status 
      ON webhook_events (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_type 
      ON webhook_events (event_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_created 
      ON webhook_events (created_at)
    `);

    // Create partial index for pending/retrying events (for efficient querying)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_pending 
      ON webhook_events (status, created_at) 
      WHERE status IN ('PENDING', 'RETRYING')
    `);

    // Create index for next_retry_at (for retry scheduling)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_events_next_retry 
      ON webhook_events (next_retry_at) 
      WHERE next_retry_at IS NOT NULL AND status = 'RETRYING'
    `);

    // Create GIN index for event_types JSONB column (for efficient filtering)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_event_types 
      ON webhook_subscriptions USING GIN (event_types)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_webhook_subscriptions_event_types
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_webhook_events_next_retry
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_webhook_events_pending
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_webhook_events_created
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_webhook_events_type
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_webhook_events_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_webhook_events_subscription
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_webhook_subscriptions_key
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_webhook_subscriptions_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_webhook_subscriptions_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_webhook_subscriptions_organization
    `);

    // Drop tables
    await queryRunner.query(`
      DROP TABLE IF EXISTS webhook_events
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS webhook_subscriptions
    `);
  }
}
