import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Compliance Framework Migration
 *
 * This migration creates:
 * - compliance_frameworks table (compliance standards: GDPR, HIPAA, SOC2, ISO27001, etc.)
 * - compliance_requirements table (individual requirements within frameworks)
 * - compliance_checklists table (tenant-specific compliance checklists)
 * - compliance_checklist_items table (items in checklists)
 * - compliance_audits table (compliance audit records)
 * - compliance_audit_findings table (findings from audits)
 * - compliance_evidence table (evidence collection)
 * - compliance_automated_checks table (automated compliance checks)
 * - compliance_check_executions table (execution history for automated checks)
 * - Indexes for performance
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class ComplianceFramework0000000000054 implements MigrationInterface {
  name = 'ComplianceFramework0000000000054';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Compliance Frameworks table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS compliance_frameworks (
        id                          BIGSERIAL PRIMARY KEY,
        framework_key               VARCHAR(128) UNIQUE NOT NULL,
        framework_name              VARCHAR(255) NOT NULL,
        framework_code              VARCHAR(64) UNIQUE NOT NULL,
        description                 TEXT,
        framework_type              VARCHAR(64) NOT NULL,
        framework_version           VARCHAR(32),
        framework_authority         VARCHAR(255),
        framework_url               VARCHAR(512),
        applicable_regions          JSONB,
        applicable_industries       JSONB,
        mandatory                   BOOLEAN NOT NULL DEFAULT false,
        compliance_level            VARCHAR(32),
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_enabled                  BOOLEAN NOT NULL DEFAULT false,
        effective_date              DATE,
        expiry_date                 DATE,
        last_reviewed_at            TIMESTAMPTZ,
        next_review_at              TIMESTAMPTZ,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_compliance_frameworks_created_by 
          FOREIGN KEY (created_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_compliance_frameworks_updated_by 
          FOREIGN KEY (updated_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_code 
      ON compliance_frameworks (framework_code)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_active 
      ON compliance_frameworks (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_enabled 
      ON compliance_frameworks (is_enabled)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_type 
      ON compliance_frameworks (framework_type)
    `);

    // Compliance Requirements table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS compliance_requirements (
        id                          BIGSERIAL PRIMARY KEY,
        requirement_key             VARCHAR(128) UNIQUE NOT NULL,
        framework_id                BIGINT NOT NULL,
        requirement_code            VARCHAR(128) NOT NULL,
        requirement_title           VARCHAR(255) NOT NULL,
        requirement_description    TEXT,
        requirement_category        VARCHAR(128),
        requirement_type            VARCHAR(64) NOT NULL,
        requirement_text            TEXT NOT NULL,
        requirement_guidance        TEXT,
        legal_reference             VARCHAR(255),
        priority                    VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
        criticality                 VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
        is_mandatory                BOOLEAN NOT NULL DEFAULT true,
        parent_requirement_id       BIGINT,
        related_requirements       JSONB,
        evidence_required           BOOLEAN NOT NULL DEFAULT true,
        evidence_types              JSONB,
        validation_method           VARCHAR(64),
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        sort_order                  INTEGER NOT NULL DEFAULT 0,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_compliance_requirements_framework 
          FOREIGN KEY (framework_id) 
          REFERENCES compliance_frameworks(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_compliance_requirements_parent 
          FOREIGN KEY (parent_requirement_id) 
          REFERENCES compliance_requirements(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_compliance_requirements_created_by 
          FOREIGN KEY (created_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_compliance_requirements_updated_by 
          FOREIGN KEY (updated_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_requirements_framework 
      ON compliance_requirements (framework_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_requirements_code 
      ON compliance_requirements (requirement_code)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_requirements_category 
      ON compliance_requirements (requirement_category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_requirements_priority 
      ON compliance_requirements (priority)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_requirements_parent 
      ON compliance_requirements (parent_requirement_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_requirements_active 
      ON compliance_requirements (is_active)
    `);

    // Compliance Checklists table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS compliance_checklists (
        id                          BIGSERIAL PRIMARY KEY,
        checklist_key               VARCHAR(128) UNIQUE NOT NULL,
        framework_id                BIGINT NOT NULL,
        checklist_name              VARCHAR(255) NOT NULL,
        checklist_description       TEXT,
        checklist_type              VARCHAR(64) NOT NULL,
        checklist_version           VARCHAR(32) NOT NULL DEFAULT '1.0',
        organization_id             BIGINT,
        department_id               BIGINT,
        is_tenant_wide              BOOLEAN NOT NULL DEFAULT true,
        checklist_status            VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
        completion_percentage       DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        total_requirements          INTEGER NOT NULL DEFAULT 0,
        completed_requirements      INTEGER NOT NULL DEFAULT 0,
        in_progress_requirements    INTEGER NOT NULL DEFAULT 0,
        not_started_requirements    INTEGER NOT NULL DEFAULT 0,
        start_date                  DATE,
        target_completion_date      DATE,
        completed_at                TIMESTAMPTZ,
        assigned_to                 BIGINT,
        assigned_team               BIGINT,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        metadata                    JSONB,
        CONSTRAINT fk_compliance_checklists_framework 
          FOREIGN KEY (framework_id) 
          REFERENCES compliance_frameworks(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_compliance_checklists_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_compliance_checklists_assigned_to 
          FOREIGN KEY (assigned_to) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_compliance_checklists_created_by 
          FOREIGN KEY (created_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_compliance_checklists_updated_by 
          FOREIGN KEY (updated_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_checklists_framework 
      ON compliance_checklists (framework_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_checklists_status 
      ON compliance_checklists (checklist_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_checklists_organization 
      ON compliance_checklists (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_checklists_assigned 
      ON compliance_checklists (assigned_to)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_checklists_target_date 
      ON compliance_checklists (target_completion_date)
    `);

    // Compliance Checklist Items table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS compliance_checklist_items (
        id                          BIGSERIAL PRIMARY KEY,
        checklist_id                BIGINT NOT NULL,
        requirement_id              BIGINT NOT NULL,
        item_status                 VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED',
        completion_percentage       DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        assigned_to                 BIGINT,
        assigned_at                 TIMESTAMPTZ,
        started_at                  TIMESTAMPTZ,
        completed_at                TIMESTAMPTZ,
        due_date                    DATE,
        notes                       TEXT,
        comments                    TEXT,
        exemption_reason            TEXT,
        evidence_count              INTEGER NOT NULL DEFAULT 0,
        last_evidence_date          TIMESTAMPTZ,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_checklist_items_checklist 
          FOREIGN KEY (checklist_id) 
          REFERENCES compliance_checklists(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_checklist_items_requirement 
          FOREIGN KEY (requirement_id) 
          REFERENCES compliance_requirements(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_checklist_items_assigned_to 
          FOREIGN KEY (assigned_to) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_checklist_items_created_by 
          FOREIGN KEY (created_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_checklist_items_updated_by 
          FOREIGN KEY (updated_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist 
      ON compliance_checklist_items (checklist_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_checklist_items_requirement 
      ON compliance_checklist_items (requirement_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_checklist_items_status 
      ON compliance_checklist_items (item_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_checklist_items_assigned 
      ON compliance_checklist_items (assigned_to)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_checklist_items_due_date 
      ON compliance_checklist_items (due_date)
    `);

    // Compliance Audits table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS compliance_audits (
        id                          BIGSERIAL PRIMARY KEY,
        audit_key                   VARCHAR(128) UNIQUE NOT NULL,
        framework_id                BIGINT NOT NULL,
        checklist_id                BIGINT,
        audit_name                  VARCHAR(255) NOT NULL,
        audit_type                  VARCHAR(64) NOT NULL,
        audit_scope                 TEXT,
        audit_description           TEXT,
        audit_start_date            DATE NOT NULL,
        audit_end_date              DATE,
        audit_status                VARCHAR(32) NOT NULL DEFAULT 'PLANNED',
        overall_score               DECIMAL(5,2),
        compliance_percentage       DECIMAL(5,2),
        total_requirements          INTEGER NOT NULL DEFAULT 0,
        compliant_requirements      INTEGER NOT NULL DEFAULT 0,
        non_compliant_requirements  INTEGER NOT NULL DEFAULT 0,
        partially_compliant         INTEGER NOT NULL DEFAULT 0,
        exempt_requirements         INTEGER NOT NULL DEFAULT 0,
        audit_lead_id               BIGINT,
        auditor_ids                 JSONB,
        auditee_ids                 JSONB,
        external_auditor_name       VARCHAR(255),
        external_auditor_contact     VARCHAR(255),
        findings_count              INTEGER NOT NULL DEFAULT 0,
        critical_findings           INTEGER NOT NULL DEFAULT 0,
        high_findings               INTEGER NOT NULL DEFAULT 0,
        medium_findings             INTEGER NOT NULL DEFAULT 0,
        low_findings                INTEGER NOT NULL DEFAULT 0,
        audit_report_path           VARCHAR(512),
        audit_report_generated_at   TIMESTAMPTZ,
        requires_remediation        BOOLEAN NOT NULL DEFAULT false,
        remediation_plan_id         BIGINT,
        next_audit_date             DATE,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_compliance_audits_framework 
          FOREIGN KEY (framework_id) 
          REFERENCES compliance_frameworks(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_compliance_audits_checklist 
          FOREIGN KEY (checklist_id) 
          REFERENCES compliance_checklists(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_compliance_audits_lead 
          FOREIGN KEY (audit_lead_id) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_compliance_audits_created_by 
          FOREIGN KEY (created_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_compliance_audits_updated_by 
          FOREIGN KEY (updated_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_audits_framework 
      ON compliance_audits (framework_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_audits_checklist 
      ON compliance_audits (checklist_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_audits_status 
      ON compliance_audits (audit_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_audits_type 
      ON compliance_audits (audit_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_audits_start_date 
      ON compliance_audits (audit_start_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_audits_lead 
      ON compliance_audits (audit_lead_id)
    `);

    // Compliance Audit Findings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS compliance_audit_findings (
        id                          BIGSERIAL PRIMARY KEY,
        audit_id                    BIGINT NOT NULL,
        requirement_id              BIGINT,
        checklist_item_id           BIGINT,
        finding_type                VARCHAR(32) NOT NULL,
        severity                    VARCHAR(32) NOT NULL,
        finding_title               VARCHAR(255) NOT NULL,
        finding_description         TEXT NOT NULL,
        root_cause                  TEXT,
        impact                      TEXT,
        remediation_required        BOOLEAN NOT NULL DEFAULT true,
        remediation_description     TEXT,
        remediation_deadline        DATE,
        remediation_status          VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        remediation_completed_at    TIMESTAMPTZ,
        remediation_verified_at     TIMESTAMPTZ,
        remediation_verified_by     BIGINT,
        assigned_to                 BIGINT,
        assigned_at                 TIMESTAMPTZ,
        finding_status              VARCHAR(32) NOT NULL DEFAULT 'OPEN',
        resolved_at                 TIMESTAMPTZ,
        resolved_by                 BIGINT,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_audit_findings_audit 
          FOREIGN KEY (audit_id) 
          REFERENCES compliance_audits(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_audit_findings_requirement 
          FOREIGN KEY (requirement_id) 
          REFERENCES compliance_requirements(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_audit_findings_checklist_item 
          FOREIGN KEY (checklist_item_id) 
          REFERENCES compliance_checklist_items(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_audit_findings_remediation_verified_by 
          FOREIGN KEY (remediation_verified_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_audit_findings_assigned_to 
          FOREIGN KEY (assigned_to) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_audit_findings_resolved_by 
          FOREIGN KEY (resolved_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_audit_findings_created_by 
          FOREIGN KEY (created_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_audit_findings_updated_by 
          FOREIGN KEY (updated_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_findings_audit 
      ON compliance_audit_findings (audit_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_findings_requirement 
      ON compliance_audit_findings (requirement_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_findings_status 
      ON compliance_audit_findings (finding_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_findings_severity 
      ON compliance_audit_findings (severity)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_findings_remediation_status 
      ON compliance_audit_findings (remediation_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_findings_assigned 
      ON compliance_audit_findings (assigned_to)
    `);

    // Compliance Evidence table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS compliance_evidence (
        id                          BIGSERIAL PRIMARY KEY,
        evidence_key                VARCHAR(128) UNIQUE NOT NULL,
        requirement_id              BIGINT NOT NULL,
        checklist_item_id           BIGINT,
        audit_id                    BIGINT,
        evidence_type               VARCHAR(64) NOT NULL,
        evidence_name               VARCHAR(255) NOT NULL,
        evidence_description        TEXT,
        file_path                   VARCHAR(512),
        file_name                   VARCHAR(255),
        file_size                   BIGINT,
        file_type                   VARCHAR(64),
        file_hash                   VARCHAR(256),
        evidence_date               DATE,
        collected_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
        collected_by                BIGINT,
        is_validated                BOOLEAN NOT NULL DEFAULT false,
        validated_at                TIMESTAMPTZ,
        validated_by                BIGINT,
        validation_notes            TEXT,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_archived                 BOOLEAN NOT NULL DEFAULT false,
        archived_at                 TIMESTAMPTZ,
        expires_at                  TIMESTAMPTZ,
        related_evidence_ids        JSONB,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_compliance_evidence_requirement 
          FOREIGN KEY (requirement_id) 
          REFERENCES compliance_requirements(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_compliance_evidence_checklist_item 
          FOREIGN KEY (checklist_item_id) 
          REFERENCES compliance_checklist_items(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_compliance_evidence_audit 
          FOREIGN KEY (audit_id) 
          REFERENCES compliance_audits(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_compliance_evidence_collected_by 
          FOREIGN KEY (collected_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_compliance_evidence_validated_by 
          FOREIGN KEY (validated_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_evidence_requirement 
      ON compliance_evidence (requirement_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_evidence_checklist_item 
      ON compliance_evidence (checklist_item_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_evidence_audit 
      ON compliance_evidence (audit_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_evidence_type 
      ON compliance_evidence (evidence_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_evidence_validated 
      ON compliance_evidence (is_validated)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_evidence_collected_by 
      ON compliance_evidence (collected_by)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_compliance_evidence_expires 
      ON compliance_evidence (expires_at)
    `);

    // Compliance Automated Checks table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS compliance_automated_checks (
        id                          BIGSERIAL PRIMARY KEY,
        check_key                   VARCHAR(128) UNIQUE NOT NULL,
        requirement_id              BIGINT NOT NULL,
        check_name                  VARCHAR(255) NOT NULL,
        check_description           TEXT,
        check_type                  VARCHAR(64) NOT NULL,
        check_script                TEXT,
        check_configuration         JSONB,
        execution_frequency         VARCHAR(64) NOT NULL DEFAULT 'DAILY',
        last_executed_at            TIMESTAMPTZ,
        next_execution_at           TIMESTAMPTZ,
        execution_count             INTEGER NOT NULL DEFAULT 0,
        last_result                VARCHAR(32),
        last_result_message        TEXT,
        last_result_details        JSONB,
        last_execution_duration_ms  INTEGER,
        pass_threshold              DECIMAL(5,2),
        warning_threshold           DECIMAL(5,2),
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_enabled                  BOOLEAN NOT NULL DEFAULT true,
        notify_on_failure           BOOLEAN NOT NULL DEFAULT true,
        notify_recipients           JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        metadata                    JSONB,
        CONSTRAINT fk_automated_checks_requirement 
          FOREIGN KEY (requirement_id) 
          REFERENCES compliance_requirements(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_automated_checks_created_by 
          FOREIGN KEY (created_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_automated_checks_updated_by 
          FOREIGN KEY (updated_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_automated_checks_requirement 
      ON compliance_automated_checks (requirement_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_automated_checks_active 
      ON compliance_automated_checks (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_automated_checks_enabled 
      ON compliance_automated_checks (is_enabled)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_automated_checks_next_execution 
      ON compliance_automated_checks (next_execution_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_automated_checks_last_result 
      ON compliance_automated_checks (last_result)
    `);

    // Compliance Check Executions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS compliance_check_executions (
        id                          BIGSERIAL PRIMARY KEY,
        check_id                    BIGINT NOT NULL,
        execution_status            VARCHAR(32) NOT NULL,
        execution_result           VARCHAR(32),
        execution_message          TEXT,
        execution_details          JSONB,
        started_at                  TIMESTAMPTZ NOT NULL,
        completed_at                TIMESTAMPTZ,
        duration_ms                 INTEGER,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_check_executions_check 
          FOREIGN KEY (check_id) 
          REFERENCES compliance_automated_checks(id) 
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_check_executions_check 
      ON compliance_check_executions (check_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_check_executions_status 
      ON compliance_check_executions (execution_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_check_executions_result 
      ON compliance_check_executions (execution_result)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_check_executions_started 
      ON compliance_check_executions (started_at DESC)
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE compliance_frameworks IS 'Compliance frameworks and standards (GDPR, HIPAA, SOC2, ISO27001, etc.)';
      COMMENT ON TABLE compliance_requirements IS 'Individual compliance requirements within frameworks';
      COMMENT ON TABLE compliance_checklists IS 'Tenant-specific compliance checklists';
      COMMENT ON TABLE compliance_checklist_items IS 'Individual items in compliance checklists';
      COMMENT ON TABLE compliance_audits IS 'Compliance audit records';
      COMMENT ON TABLE compliance_audit_findings IS 'Individual findings from compliance audits';
      COMMENT ON TABLE compliance_evidence IS 'Evidence collected for compliance requirements';
      COMMENT ON TABLE compliance_automated_checks IS 'Automated compliance checks and validations';
      COMMENT ON TABLE compliance_check_executions IS 'Execution history for automated compliance checks';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS compliance_check_executions`);
    await queryRunner.query(`DROP TABLE IF EXISTS compliance_automated_checks`);
    await queryRunner.query(`DROP TABLE IF EXISTS compliance_evidence`);
    await queryRunner.query(`DROP TABLE IF EXISTS compliance_audit_findings`);
    await queryRunner.query(`DROP TABLE IF EXISTS compliance_audits`);
    await queryRunner.query(`DROP TABLE IF EXISTS compliance_checklist_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS compliance_checklists`);
    await queryRunner.query(`DROP TABLE IF EXISTS compliance_requirements`);
    await queryRunner.query(`DROP TABLE IF EXISTS compliance_frameworks`);
  }
}

