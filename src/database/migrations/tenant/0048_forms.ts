import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Form Builder API Migration
 * 
 * This migration creates:
 * - form_definitions table for form schemas
 * - form_responses table for form submissions
 * - Indexes for performance
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Forms0000000000048 implements MigrationInterface {
  name = 'Forms0000000000048';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create form_definitions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS form_definitions (
        id BIGSERIAL PRIMARY KEY,
        form_name VARCHAR(255) NOT NULL,
        form_description TEXT,
        organization_id BIGINT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
        access_type VARCHAR(32) NOT NULL DEFAULT 'AUTHENTICATED',
        form_schema JSONB NOT NULL,
        form_version INTEGER NOT NULL DEFAULT 1,
        parent_form_id BIGINT,
        template_id BIGINT,
        is_template BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        allow_anonymous BOOLEAN NOT NULL DEFAULT false,
        allow_multiple_submissions BOOLEAN NOT NULL DEFAULT true,
        max_submissions_per_user INTEGER,
        category VARCHAR(128),
        tags JSONB,
        permissions_config JSONB,
        workflow_id BIGINT,
        notification_config JSONB,
        form_settings JSONB,
        form_metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by BIGINT,
        updated_by BIGINT,
        CONSTRAINT fk_form_definitions_organization
          FOREIGN KEY (organization_id)
          REFERENCES organizations(id)
          ON DELETE CASCADE
      )
    `);

    // Create form_responses table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS form_responses (
        id BIGSERIAL PRIMARY KEY,
        form_definition_id BIGINT NOT NULL,
        response_data JSONB NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
        is_anonymous BOOLEAN NOT NULL DEFAULT false,
        submitted_by BIGINT,
        anonymous_identifier VARCHAR(255),
        submitted_at TIMESTAMPTZ,
        ip_address VARCHAR(45),
        user_agent TEXT,
        workflow_instance_id BIGINT,
        notes TEXT,
        processed_by BIGINT,
        processed_at TIMESTAMPTZ,
        response_metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_form_responses_form_definition
          FOREIGN KEY (form_definition_id)
          REFERENCES form_definitions(id)
          ON DELETE CASCADE
      )
    `);

    // Create indexes for form_definitions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_form_definitions_organization 
      ON form_definitions (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_form_definitions_status 
      ON form_definitions (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_form_definitions_access 
      ON form_definitions (access_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_form_definitions_template 
      ON form_definitions (is_template)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_form_definitions_active 
      ON form_definitions (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_form_definitions_category 
      ON form_definitions (category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_form_definitions_parent 
      ON form_definitions (parent_form_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_form_definitions_org_status_active 
      ON form_definitions (organization_id, status, is_active)
    `);

    // Create indexes for form_responses
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_form_responses_form 
      ON form_responses (form_definition_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_form_responses_user 
      ON form_responses (submitted_by)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_form_responses_status 
      ON form_responses (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_form_responses_submitted 
      ON form_responses (submitted_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_form_responses_anonymous 
      ON form_responses (is_anonymous)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_form_responses_form_status 
      ON form_responses (form_definition_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_form_responses_form_user 
      ON form_responses (form_definition_id, submitted_by)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes for form_responses
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_form_responses_form_user
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_form_responses_form_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_form_responses_anonymous
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_form_responses_submitted
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_form_responses_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_form_responses_user
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_form_responses_form
    `);

    // Drop indexes for form_definitions
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_form_definitions_org_status_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_form_definitions_parent
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_form_definitions_category
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_form_definitions_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_form_definitions_template
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_form_definitions_access
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_form_definitions_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_form_definitions_organization
    `);

    // Drop tables
    await queryRunner.query(`
      DROP TABLE IF EXISTS form_responses
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS form_definitions
    `);
  }
}
