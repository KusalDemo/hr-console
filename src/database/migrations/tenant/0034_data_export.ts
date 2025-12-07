import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Data Export & Reporting Service Migration
 *
 * This migration creates:
 * - export_templates table (reusable export templates with field selection, formatting, filters)
 * - export_jobs table (export job tracking with status, progress, file generation, email delivery)
 * - Indexes for performance optimization
 * - Foreign key relationships
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class DataExport0000000000034 implements MigrationInterface {
  name = 'DataExport0000000000034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Export Templates table - Reusable export templates with field selection and formatting rules
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS export_templates (
        id                          BIGSERIAL PRIMARY KEY,
        name                        VARCHAR(255) NOT NULL,
        description                 TEXT,
        entity_type                 VARCHAR(128) NOT NULL,
        export_format               VARCHAR(32) NOT NULL DEFAULT 'CSV',
        organization_id             BIGINT,
        field_selection             JSONB,
        formatting_rules            JSONB,
        default_filters             JSONB,
        default_sorting             JSONB,
        query_builder_config        JSONB,
        pdf_template_config          JSONB,
        excel_template_config       JSONB,
        supports_scheduling         BOOLEAN NOT NULL DEFAULT false,
        default_email_recipients    JSONB,
        default_email_subject       VARCHAR(255),
        default_email_body          TEXT,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_system                   BOOLEAN NOT NULL DEFAULT false,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_export_templates_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for export_templates
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_export_templates_entity_type 
      ON export_templates (entity_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_export_templates_organization 
      ON export_templates (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_export_templates_active 
      ON export_templates (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_export_templates_entity_org 
      ON export_templates (entity_type, organization_id, is_active)
    `);

    // Export Jobs table - Tracks export jobs with status, progress, file generation, and email delivery
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS export_jobs (
        id                          BIGSERIAL PRIMARY KEY,
        template_id                 BIGINT,
        entity_type                 VARCHAR(128) NOT NULL,
        export_format               VARCHAR(32) NOT NULL DEFAULT 'CSV',
        status                      VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        organization_id             BIGINT NOT NULL,
        file_name                   VARCHAR(512),
        file_size                   BIGINT,
        file_path                   VARCHAR(1024),
        total_records               INTEGER NOT NULL DEFAULT 0,
        progress_percentage         DECIMAL(5,2) NOT NULL DEFAULT 0,
        error_message               TEXT,
        error_details               JSONB,
        export_query                JSONB,
        field_selection             JSONB,
        filters                     JSONB,
        sorting                     JSONB,
        delivery_method             VARCHAR(32) NOT NULL DEFAULT 'DOWNLOAD',
        email_recipients            JSONB,
        email_subject               VARCHAR(255),
        email_body                  TEXT,
        email_sent                  BOOLEAN NOT NULL DEFAULT false,
        email_sent_at               TIMESTAMPTZ,
        is_scheduled                BOOLEAN NOT NULL DEFAULT false,
        scheduled_at                TIMESTAMPTZ,
        schedule_recurrence         VARCHAR(255),
        started_at                  TIMESTAMPTZ,
        completed_at                TIMESTAMPTZ,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_export_jobs_template 
          FOREIGN KEY (template_id) 
          REFERENCES export_templates(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_export_jobs_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for export_jobs
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_export_jobs_status 
      ON export_jobs (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_export_jobs_entity_type 
      ON export_jobs (entity_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_export_jobs_organization 
      ON export_jobs (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_export_jobs_created 
      ON export_jobs (created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_export_jobs_template 
      ON export_jobs (template_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_export_jobs_scheduled 
      ON export_jobs (is_scheduled, scheduled_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_export_jobs_status_org 
      ON export_jobs (status, organization_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_export_jobs_entity_org 
      ON export_jobs (entity_type, organization_id, status, created_at DESC)
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE export_templates IS 'Reusable export templates with field selection, formatting rules, filters, sorting, query builder configuration, PDF/Excel template configs, and scheduled export support';
      COMMENT ON COLUMN export_templates.field_selection IS 'JSON array: Fields to include in export';
      COMMENT ON COLUMN export_templates.formatting_rules IS 'JSON: Formatting rules for each field (date format, currency, number format, etc.)';
      COMMENT ON COLUMN export_templates.default_filters IS 'JSON: Default filters to apply';
      COMMENT ON COLUMN export_templates.default_sorting IS 'JSON: Default sorting configuration';
      COMMENT ON COLUMN export_templates.query_builder_config IS 'JSON: Query builder configuration for custom report queries';
      COMMENT ON COLUMN export_templates.pdf_template_config IS 'JSON: PDF template configuration (layout, headers, footers, etc.)';
      COMMENT ON COLUMN export_templates.excel_template_config IS 'JSON: Excel template configuration (sheet structure, styles, etc.)';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE export_jobs IS 'Export job tracking with status, progress, file generation (PDF, Excel, CSV, JSON), email delivery, scheduled exports, and storage integration';
      COMMENT ON COLUMN export_jobs.status IS 'Job status: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED';
      COMMENT ON COLUMN export_jobs.export_format IS 'Export format: PDF, EXCEL, CSV, JSON';
      COMMENT ON COLUMN export_jobs.delivery_method IS 'Delivery method: DOWNLOAD, EMAIL, STORAGE';
      COMMENT ON COLUMN export_jobs.export_query IS 'JSON: Export query/filters defining what data to export';
      COMMENT ON COLUMN export_jobs.field_selection IS 'JSON array: Fields to include in export';
      COMMENT ON COLUMN export_jobs.filters IS 'JSON: Filters to apply to the data';
      COMMENT ON COLUMN export_jobs.sorting IS 'JSON: Sorting configuration';
      COMMENT ON COLUMN export_jobs.schedule_recurrence IS 'Schedule recurrence pattern (cron expression or JSON)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop export_jobs table first (due to foreign key)
    await queryRunner.query(`DROP TABLE IF EXISTS export_jobs CASCADE`);

    // Drop export_templates table
    await queryRunner.query(`DROP TABLE IF EXISTS export_templates CASCADE`);
  }
}
