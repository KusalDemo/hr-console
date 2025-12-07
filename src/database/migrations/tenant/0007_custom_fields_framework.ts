import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Custom Fields Framework Migration
 * 
 * This migration creates:
 * - custom_field_definitions table (field definitions for any entity type)
 * - custom_field_values table (actual values for entity instances)
 * - Indexes for performance
 * - Foreign key relationships
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class CustomFieldsFramework0000000000007 implements MigrationInterface {
  name = 'CustomFieldsFramework0000000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Custom Field Definitions table - Defines custom fields for any entity type
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS custom_field_definitions (
        id                          BIGSERIAL PRIMARY KEY,
        entity_type                 VARCHAR(128) NOT NULL,
        field_key                   VARCHAR(128) NOT NULL,
        field_name                  VARCHAR(255) NOT NULL,
        description                 TEXT,
        field_type                  VARCHAR(32) NOT NULL DEFAULT 'TEXT',
        is_required                 BOOLEAN NOT NULL DEFAULT false,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        display_order               INTEGER NOT NULL DEFAULT 0,
        default_value               TEXT,
        validation_rules            JSONB,
        options                     JSONB,
        reference_config            JSONB,
        formula                     TEXT,
        visibility_rules            JSONB,
        permissions                 JSONB,
        organization_id             BIGINT,
        field_metadata              JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT uq_custom_field_def_entity_key UNIQUE (entity_type, field_key)
      )
    `);

    // Create indexes for custom_field_definitions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_custom_field_def_entity_type 
      ON custom_field_definitions (entity_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_custom_field_def_key 
      ON custom_field_definitions (field_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_custom_field_def_active 
      ON custom_field_definitions (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_custom_field_def_organization 
      ON custom_field_definitions (organization_id)
    `);

    // Custom Field Values table - Stores actual values for entity instances
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS custom_field_values (
        id                          BIGSERIAL PRIMARY KEY,
        entity_type                 VARCHAR(128) NOT NULL,
        entity_id                   BIGINT NOT NULL,
        field_definition_id         BIGINT NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
        organization_id             BIGINT,
        text_value                  TEXT,
        number_value                BIGINT,
        decimal_value               DECIMAL(18,4),
        boolean_value               BOOLEAN,
        date_value                  DATE,
        datetime_value              TIMESTAMPTZ,
        json_value                  JSONB,
        file_value                  VARCHAR(512),
        value_metadata              JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT uq_custom_field_val_entity_def UNIQUE (entity_type, entity_id, field_definition_id)
      )
    `);

    // Create indexes for custom_field_values
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_custom_field_val_entity 
      ON custom_field_values (entity_type, entity_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_custom_field_val_definition 
      ON custom_field_values (field_definition_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_custom_field_val_organization 
      ON custom_field_values (organization_id)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE custom_field_definitions IS 'Custom field definitions for any entity type with validation, permissions, and conditional visibility'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE custom_field_values IS 'Custom field values for entity instances, supporting multiple data types'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN custom_field_definitions.field_type IS 'TEXT, NUMBER, DECIMAL, DATE, DATETIME, BOOLEAN, DROPDOWN, MULTI_SELECT, FILE, FORMULA, REFERENCE, TEXTAREA, URL, EMAIL, PHONE'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN custom_field_definitions.validation_rules IS 'JSON object with validation rules: min, max, minLength, maxLength, pattern, etc.'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN custom_field_definitions.options IS 'JSON array of {value, label} objects for DROPDOWN and MULTI_SELECT types'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN custom_field_definitions.reference_config IS 'JSON object with reference configuration for REFERENCE type: {entityType, displayField, valueField}'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN custom_field_definitions.visibility_rules IS 'JSON object with conditional visibility rules: {field, operator, value}'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN custom_field_definitions.permissions IS 'JSON object with field-level permissions: {view: [roles], edit: [roles]}'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN custom_field_values.entity_type IS 'Entity type this value belongs to (e.g., Employee, Project, Client)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN custom_field_values.entity_id IS 'Entity ID this value belongs to'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS custom_field_values CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS custom_field_definitions CASCADE`);
  }
}


