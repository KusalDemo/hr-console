import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Advanced Reporting Engine Migration
 * 
 * This migration creates:
 * - report_definitions table for custom report definitions
 * - report_schedules table for scheduled report generation
 * - Indexes for performance
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Reports0000000000049 implements MigrationInterface {
  name = 'Reports0000000000049';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create report_definitions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS report_definitions (
        id BIGSERIAL PRIMARY KEY,
        report_name VARCHAR(255) NOT NULL,
        report_description TEXT,
        organization_id BIGINT NOT NULL,
        report_type VARCHAR(32) NOT NULL DEFAULT 'TABLE',
        status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
        data_source_config JSONB NOT NULL,
        field_selections JSONB,
        filter_config JSONB,
        grouping_config JSONB,
        sorting_config JSONB,
        default_output_format VARCHAR(32) NOT NULL DEFAULT 'PDF',
        report_template JSONB,
        is_template BOOLEAN NOT NULL DEFAULT false,
        template_id BIGINT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        category VARCHAR(128),
        tags JSONB,
        permissions_config JSONB,
        email_config JSONB,
        report_metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by BIGINT,
        updated_by BIGINT,
        CONSTRAINT fk_report_definitions_organization
          FOREIGN KEY (organization_id)
          REFERENCES organizations(id)
          ON DELETE CASCADE
      )
    `);

    // Create report_schedules table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS report_schedules (
        id BIGSERIAL PRIMARY KEY,
        report_definition_id BIGINT NOT NULL,
        schedule_name VARCHAR(255) NOT NULL,
        schedule_description TEXT,
        frequency VARCHAR(32) NOT NULL DEFAULT 'DAILY',
        cron_expression VARCHAR(128),
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        start_date DATE,
        end_date DATE,
        next_run_at TIMESTAMPTZ,
        last_run_at TIMESTAMPTZ,
        output_format VARCHAR(32),
        email_recipients JSONB,
        email_subject VARCHAR(255),
        email_body TEXT,
        schedule_config JSONB,
        execution_count INTEGER NOT NULL DEFAULT 0,
        last_execution_status VARCHAR(32),
        last_execution_error TEXT,
        schedule_metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by BIGINT,
        updated_by BIGINT,
        CONSTRAINT fk_report_schedules_report_definition
          FOREIGN KEY (report_definition_id)
          REFERENCES report_definitions(id)
          ON DELETE CASCADE
      )
    `);

    // Create indexes for report_definitions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_report_definitions_organization 
      ON report_definitions (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_report_definitions_status 
      ON report_definitions (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_report_definitions_type 
      ON report_definitions (report_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_report_definitions_category 
      ON report_definitions (category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_report_definitions_active 
      ON report_definitions (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_report_definitions_template 
      ON report_definitions (is_template)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_report_definitions_org_status_active 
      ON report_definitions (organization_id, status, is_active)
    `);

    // Create indexes for report_schedules
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_report_schedules_report 
      ON report_schedules (report_definition_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_report_schedules_status 
      ON report_schedules (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run 
      ON report_schedules (next_run_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_report_schedules_active 
      ON report_schedules (status, next_run_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_report_schedules_frequency 
      ON report_schedules (frequency)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes for report_schedules
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_report_schedules_frequency
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_report_schedules_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_report_schedules_next_run
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_report_schedules_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_report_schedules_report
    `);

    // Drop indexes for report_definitions
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_report_definitions_org_status_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_report_definitions_template
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_report_definitions_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_report_definitions_category
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_report_definitions_type
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_report_definitions_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_report_definitions_organization
    `);

    // Drop tables
    await queryRunner.query(`
      DROP TABLE IF EXISTS report_schedules
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS report_definitions
    `);
  }
}
