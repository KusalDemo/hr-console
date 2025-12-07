import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Integration Framework Migration
 * 
 * This migration creates:
 * - integrations table (OAuth2, API key, webhook, basic auth integrations)
 * - integration_health table (integration health monitoring)
 * - Indexes for performance optimization
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Integrations0000000000042 implements MigrationInterface {
  name = 'Integrations0000000000042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Integrations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS integrations (
        id                          BIGSERIAL PRIMARY KEY,
        integration_key             VARCHAR(128) UNIQUE NOT NULL,
        integration_name            VARCHAR(255) NOT NULL,
        description                 TEXT,
        integration_type            VARCHAR(32) NOT NULL,
        provider                    VARCHAR(128) NOT NULL,
        status                      VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        
        -- OAuth2 fields
        oauth2_client_id            VARCHAR(512),
        oauth2_client_secret        VARCHAR(512),
        oauth2_access_token         TEXT,
        oauth2_refresh_token        TEXT,
        oauth2_token_expires_at     TIMESTAMPTZ,
        oauth2_authorization_url    VARCHAR(512),
        oauth2_token_url           VARCHAR(512),
        oauth2_scopes              JSONB,
        
        -- API Key fields
        api_key                     VARCHAR(512),
        api_secret                  VARCHAR(512),
        
        -- Basic Auth fields
        basic_auth_username         VARCHAR(255),
        basic_auth_password         VARCHAR(512),
        
        -- Webhook fields
        webhook_url                 VARCHAR(512),
        webhook_secret              VARCHAR(512),
        
        -- Common fields
        base_url                    VARCHAR(512),
        custom_headers              JSONB,
        configuration               JSONB,
        
        -- Health monitoring
        last_health_check_at        TIMESTAMPTZ,
        last_successful_connection_at TIMESTAMPTZ,
        last_error                  TEXT,
        error_count                 INTEGER NOT NULL DEFAULT 0,
        
        -- Metadata
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for integrations
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integrations_key 
      ON integrations (integration_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integrations_type 
      ON integrations (integration_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integrations_status 
      ON integrations (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integrations_active 
      ON integrations (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integrations_provider 
      ON integrations (provider)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integrations_oauth2_expires 
      ON integrations (oauth2_token_expires_at) 
      WHERE oauth2_token_expires_at IS NOT NULL
    `);

    // Integration Health table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS integration_health (
        id                          BIGSERIAL PRIMARY KEY,
        integration_id              BIGINT NOT NULL,
        status                      VARCHAR(32) NOT NULL,
        response_time_ms            INTEGER,
        http_status_code            INTEGER,
        error_message               TEXT,
        check_details               JSONB,
        is_successful               BOOLEAN NOT NULL DEFAULT true,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_integration_health_integration 
          FOREIGN KEY (integration_id) 
          REFERENCES integrations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for integration_health
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integration_health_integration 
      ON integration_health (integration_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integration_health_status 
      ON integration_health (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integration_health_created 
      ON integration_health (created_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_integration_health_integration_created 
      ON integration_health (integration_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_integration_health_integration_created
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_integration_health_created
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_integration_health_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_integration_health_integration
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_integrations_oauth2_expires
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_integrations_provider
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_integrations_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_integrations_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_integrations_type
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_integrations_key
    `);

    // Drop tables
    await queryRunner.query(`
      DROP TABLE IF EXISTS integration_health CASCADE
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS integrations CASCADE
    `);
  }
}
