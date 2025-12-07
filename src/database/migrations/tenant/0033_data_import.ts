import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Data Import Framework Migration
 * 
 * This migration creates:
 * - import_templates table (reusable import templates with field mappings, validation rules, transformation rules)
 * - import_jobs table (import job tracking with status, progress, error handling)
 * - Indexes for performance optimization
 * - Foreign key relationships
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class DataImport0000000000033 implements MigrationInterface {
  name = 'DataImport0000000000033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Import Templates table - Reusable import templates with field mappings and validation rules
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS import_templates (
        id                          BIGSERIAL PRIMARY KEY,
        name                        VARCHAR(255) NOT NULL,
        description                 TEXT,
        entity_type                 VARCHAR(128) NOT NULL,
        import_format               VARCHAR(32) NOT NULL DEFAULT 'CSV',
        organization_id             BIGINT,
        field_mappings              JSONB NOT NULL,
        validation_rules           JSONB,
        transformation_rules       JSONB,
        default_values              JSONB,
        duplicate_detection        JSONB,
        merge_strategy              VARCHAR(32) DEFAULT 'skip',
        rollback_on_failure         BOOLEAN NOT NULL DEFAULT true,
        batch_size                  INTEGER NOT NULL DEFAULT 100,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_system                   BOOLEAN NOT NULL DEFAULT false,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_import_templates_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for import_templates
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_templates_entity_type 
      ON import_templates (entity_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_templates_organization 
      ON import_templates (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_templates_active 
      ON import_templates (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_templates_entity_org 
      ON import_templates (entity_type, organization_id, is_active)
    `);

    // Import Jobs table - Tracks import jobs with status, progress, and error handling
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS import_jobs (
        id                          BIGSERIAL PRIMARY KEY,
        template_id                 BIGINT,
        entity_type                 VARCHAR(128) NOT NULL,
        import_format               VARCHAR(32) NOT NULL DEFAULT 'CSV',
        status                      VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        organization_id             BIGINT NOT NULL,
        file_name                   VARCHAR(512) NOT NULL,
        file_size                   BIGINT NOT NULL,
        file_path                   VARCHAR(1024) NOT NULL,
        total_records               INTEGER NOT NULL DEFAULT 0,
        processed_records           INTEGER NOT NULL DEFAULT 0,
        failed_records              INTEGER NOT NULL DEFAULT 0,
        skipped_records             INTEGER NOT NULL DEFAULT 0,
        progress_percentage         DECIMAL(5,2) NOT NULL DEFAULT 0,
        error_message               TEXT,
        error_details               JSONB,
        row_errors                  JSONB,
        import_config               JSONB,
        rollback_on_failure         BOOLEAN NOT NULL DEFAULT true,
        is_incremental              BOOLEAN NOT NULL DEFAULT false,
        duplicate_strategy          VARCHAR(32),
        batch_size                  INTEGER NOT NULL DEFAULT 100,
        started_at                  TIMESTAMPTZ,
        completed_at                TIMESTAMPTZ,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_import_jobs_template 
          FOREIGN KEY (template_id) 
          REFERENCES import_templates(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_import_jobs_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for import_jobs
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_jobs_status 
      ON import_jobs (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_jobs_entity_type 
      ON import_jobs (entity_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_jobs_organization 
      ON import_jobs (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_jobs_created 
      ON import_jobs (created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_jobs_template 
      ON import_jobs (template_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_jobs_status_org 
      ON import_jobs (status, organization_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_import_jobs_entity_org 
      ON import_jobs (entity_type, organization_id, status, created_at DESC)
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE import_templates IS 'Reusable import templates with field mappings, validation rules, transformation rules, default values, duplicate detection, and merge strategies';
      COMMENT ON COLUMN import_templates.field_mappings IS 'JSON: Maps source columns/fields to target entity fields';
      COMMENT ON COLUMN import_templates.validation_rules IS 'JSON: Validation rules for each field (required, type, min, max, etc.)';
      COMMENT ON COLUMN import_templates.transformation_rules IS 'JSON: Data transformation rules (uppercase, lowercase, trim, date format, etc.)';
      COMMENT ON COLUMN import_templates.default_values IS 'JSON: Default values for fields if not provided';
      COMMENT ON COLUMN import_templates.duplicate_detection IS 'JSON: Duplicate detection configuration (fields to check, strategy)';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE import_jobs IS 'Import job tracking with status, progress, error handling, batch processing, and rollback on failure';
      COMMENT ON COLUMN import_jobs.status IS 'Job status: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, PARTIALLY_COMPLETED';
      COMMENT ON COLUMN import_jobs.row_errors IS 'JSON array: Import errors by row [{ row: number, errors: string[], data: any }]';
      COMMENT ON COLUMN import_jobs.import_config IS 'JSON: Import configuration (field mappings, validation rules, merge strategies, etc.)';
      COMMENT ON COLUMN import_jobs.error_details IS 'JSON: Detailed error information for failed imports';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop import_jobs table first (due to foreign key)
    await queryRunner.query(`DROP TABLE IF EXISTS import_jobs CASCADE`);

    // Drop import_templates table
    await queryRunner.query(`DROP TABLE IF EXISTS import_templates CASCADE`);
  }
}
