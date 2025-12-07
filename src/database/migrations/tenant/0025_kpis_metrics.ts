import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KPIs & Metrics Migration
 *
 * This migration creates:
 * - kpi_definitions table (configurable KPIs with calculation formulas, data sources)
 * - kpi_measurements table (time-series KPI values for tracking measurements over time)
 * - Indexes for performance optimization
 * - Foreign key relationships
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class KpisMetrics0000000000025 implements MigrationInterface {
  name = 'KpisMetrics0000000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // KPI Definitions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpi_definitions (
        id                          BIGSERIAL PRIMARY KEY,
        kpi_name                    VARCHAR(255) NOT NULL,
        kpi_description             TEXT,
        category                    VARCHAR(128),
        organization_id              BIGINT NOT NULL,
        department_id               BIGINT,
        team_id                     BIGINT,
        calculation_type            VARCHAR(32) NOT NULL DEFAULT 'AVERAGE',
        data_source_type            VARCHAR(32) NOT NULL DEFAULT 'DATABASE',
        data_source_config          JSONB,
        calculation_formula         TEXT,
        unit                        VARCHAR(32),
        calculation_frequency       VARCHAR(32) NOT NULL DEFAULT 'DAILY',
        target_value                DECIMAL(15,2),
        min_threshold               DECIMAL(15,2),
        max_threshold               DECIMAL(15,2),
        alert_config                JSONB,
        goal_id                     BIGINT,
        key_result_id               BIGINT,
        status                      VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        last_calculated_at          TIMESTAMPTZ,
        next_calculation_at         TIMESTAMPTZ,
        kpi_metadata                JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_kpi_definitions_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for kpi_definitions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpi_definitions_organization 
      ON kpi_definitions (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpi_definitions_category 
      ON kpi_definitions (category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpi_definitions_status 
      ON kpi_definitions (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpi_definitions_frequency 
      ON kpi_definitions (calculation_frequency)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpi_definitions_active 
      ON kpi_definitions (is_active)
    `);

    // Composite index for calculation scheduling
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpi_definitions_calculation 
      ON kpi_definitions (status, is_active, next_calculation_at)
    `);

    // KPI Measurements table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpi_measurements (
        id                          BIGSERIAL PRIMARY KEY,
        kpi_definition_id            BIGINT NOT NULL,
        measurement_date            DATE NOT NULL,
        measurement_timestamp       TIMESTAMPTZ,
        value                       DECIMAL(15,2) NOT NULL,
        target_value                DECIMAL(15,2),
        target_percentage           DECIMAL(5,2),
        triggered_alert              BOOLEAN NOT NULL DEFAULT false,
        alert_details               JSONB,
        raw_data                    JSONB,
        measurement_metadata         JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_kpi_measurements_kpi 
          FOREIGN KEY (kpi_definition_id) 
          REFERENCES kpi_definitions(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for kpi_measurements
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpi_measurements_kpi 
      ON kpi_measurements (kpi_definition_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpi_measurements_date 
      ON kpi_measurements (measurement_date)
    `);

    // Composite index for time-series queries (critical for performance)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpi_measurements_period 
      ON kpi_measurements (kpi_definition_id, measurement_date)
    `);

    // Index for alert queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpi_measurements_alerts 
      ON kpi_measurements (kpi_definition_id, triggered_alert, measurement_date)
    `);

    // Add comments to tables
    await queryRunner.query(`
      COMMENT ON TABLE kpi_definitions IS 'Configurable KPIs and metric definitions with calculation formulas and data sources';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE kpi_measurements IS 'Time-series KPI values for tracking measurements over time';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN kpi_definitions.calculation_type IS 'SUM, AVERAGE, COUNT, MIN, MAX, PERCENTAGE, FORMULA, CUSTOM';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN kpi_definitions.data_source_type IS 'DATABASE, API, MANUAL, CALCULATED, GOAL';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN kpi_definitions.calculation_frequency IS 'REAL_TIME, HOURLY, DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN kpi_definitions.status IS 'ACTIVE, INACTIVE, ARCHIVED';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_kpi_measurements_alerts
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_kpi_measurements_period
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_kpi_measurements_date
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_kpi_measurements_kpi
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_kpi_definitions_calculation
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_kpi_definitions_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_kpi_definitions_frequency
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_kpi_definitions_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_kpi_definitions_category
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_kpi_definitions_organization
    `);

    // Drop tables (measurements first due to foreign key)
    await queryRunner.query(`
      DROP TABLE IF EXISTS kpi_measurements CASCADE
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS kpi_definitions CASCADE
    `);
  }
}
