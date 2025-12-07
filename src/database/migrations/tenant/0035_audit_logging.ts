import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Comprehensive Audit Logging Migration
 *
 * This migration creates:
 * - audit_logs table (comprehensive audit logging with before/after values, field-level changes)
 * - Indexes for performance optimization
 * - Support for retention policies, archival, and compliance export
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class AuditLogging0000000000035 implements MigrationInterface {
  name = 'AuditLogging0000000000035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Audit Logs table - Comprehensive audit logging with before/after values and field-level changes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id                          BIGSERIAL PRIMARY KEY,
        activity_type               VARCHAR(128) NOT NULL,
        activity_category           VARCHAR(64),
        actor_type                  VARCHAR(64) NOT NULL,
        actor_id                    BIGINT,
        actor_name                  VARCHAR(255),
        target_type                 VARCHAR(128),
        target_id                   BIGINT,
        target_name                 VARCHAR(255),
        organization_id             BIGINT,
        description                 TEXT,
        metadata                    JSONB,
        before_values               JSONB,
        after_values                JSONB,
        field_changes               JSONB,
        change_summary              TEXT,
        ip_address                  VARCHAR(45),
        user_agent                  VARCHAR(512),
        session_id                  VARCHAR(128),
        request_id                  VARCHAR(128),
        audit_level                 VARCHAR(32) NOT NULL DEFAULT 'INFO',
        compliance_tags              JSONB,
        is_public                   BOOLEAN NOT NULL DEFAULT false,
        is_archived                 BOOLEAN NOT NULL DEFAULT false,
        archived_at                 TIMESTAMPTZ,
        archived_by                 BIGINT,
        retention_until             TIMESTAMPTZ,
        is_immutable                BOOLEAN NOT NULL DEFAULT true,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_audit_logs_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE SET NULL
      )
    `);

    // Create indexes for audit_logs
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_actor 
      ON audit_logs (actor_type, actor_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_target 
      ON audit_logs (target_type, target_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_activity_type 
      ON audit_logs (activity_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created 
      ON audit_logs (created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_organization 
      ON audit_logs (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_category 
      ON audit_logs (activity_category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_audit_level 
      ON audit_logs (audit_level)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_archived 
      ON audit_logs (is_archived)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_retention 
      ON audit_logs (retention_until)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_compliance 
      ON audit_logs USING GIN (compliance_tags)
    `);

    // Composite indexes for common query patterns
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created 
      ON audit_logs (actor_type, actor_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_target_created 
      ON audit_logs (target_type, target_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created 
      ON audit_logs (organization_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_type_category 
      ON audit_logs (activity_type, activity_category, created_at DESC)
    `);

    // Full-text search index (using GIN for JSONB fields)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_description_fts 
      ON audit_logs USING GIN (to_tsvector('english', description))
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE audit_logs IS 'Comprehensive audit logging with before/after values, field-level changes, comprehensive metadata (IP, user agent, session), audit levels, compliance tags, retention policies, and archival support';
      COMMENT ON COLUMN audit_logs.activity_type IS 'Activity type (e.g., ENTITY_CREATED, ENTITY_UPDATED, USER_LOGIN, APPROVAL)';
      COMMENT ON COLUMN audit_logs.activity_category IS 'Activity category (ENTITY, AUTH, WORKFLOW, SYSTEM, SECURITY, COMPLIANCE)';
      COMMENT ON COLUMN audit_logs.actor_type IS 'Actor type (USER, SYSTEM, INTEGRATION)';
      COMMENT ON COLUMN audit_logs.before_values IS 'JSON: State of entity before the change';
      COMMENT ON COLUMN audit_logs.after_values IS 'JSON: State of entity after the change';
      COMMENT ON COLUMN audit_logs.field_changes IS 'JSON: Field-level changes { fieldName: { before: value, after: value } }';
      COMMENT ON COLUMN audit_logs.change_summary IS 'Summary of changes made';
      COMMENT ON COLUMN audit_logs.audit_level IS 'Audit level (DEBUG, INFO, WARN, ERROR, CRITICAL)';
      COMMENT ON COLUMN audit_logs.compliance_tags IS 'JSON array: Compliance tags (e.g., ["GDPR", "HIPAA", "SOX"])';
      COMMENT ON COLUMN audit_logs.retention_until IS 'Logs will be eligible for deletion after this date';
      COMMENT ON COLUMN audit_logs.is_immutable IS 'Whether this log is immutable (cannot be modified)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop audit_logs table
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs CASCADE`);
  }
}
