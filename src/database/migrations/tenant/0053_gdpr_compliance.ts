import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * GDPR & Data Privacy Compliance Migration
 * 
 * This migration creates:
 * - data_subject_requests table (GDPR data subject requests: access, deletion, portability, etc.)
 * - consents table (consent tracking and management)
 * - privacy_policy_acceptances table (privacy policy and terms acceptance tracking)
 * - Indexes for performance
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class GdprCompliance0000000000053 implements MigrationInterface {
  name = 'GdprCompliance0000000000053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Data Subject Requests table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS data_subject_requests (
        id                          BIGSERIAL PRIMARY KEY,
        request_key                 VARCHAR(128) UNIQUE NOT NULL,
        request_type                VARCHAR(64) NOT NULL,
        request_status              VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        priority                    VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
        data_subject_email          VARCHAR(255),
        data_subject_name           VARCHAR(255),
        data_subject_identifier     VARCHAR(255),
        data_subject_type           VARCHAR(64),
        description                 TEXT,
        verification_method         VARCHAR(64),
        verification_status         VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        verification_data           JSONB,
        assigned_to                 BIGINT,
        started_at                  TIMESTAMPTZ,
        completed_at                TIMESTAMPTZ,
        due_date                    TIMESTAMPTZ,
        response_data               JSONB,
        export_file_path            VARCHAR(512),
        export_file_size            BIGINT,
        export_format               VARCHAR(32),
        deletion_status             VARCHAR(32),
        anonymization_status        VARCHAR(32),
        deleted_records_count       INTEGER,
        anonymized_records_count    INTEGER,
        rejection_reason            TEXT,
        rejection_code              VARCHAR(64),
        cancelled_at                TIMESTAMPTZ,
        cancelled_by                BIGINT,
        cancellation_reason         TEXT,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        metadata                    JSONB,
        CONSTRAINT fk_data_subject_requests_assigned 
          FOREIGN KEY (assigned_to) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_data_subject_requests_created_by 
          FOREIGN KEY (created_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_data_subject_requests_updated_by 
          FOREIGN KEY (updated_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_data_subject_requests_cancelled_by 
          FOREIGN KEY (cancelled_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_data_subject_requests_type 
      ON data_subject_requests (request_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_data_subject_requests_status 
      ON data_subject_requests (request_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_data_subject_requests_email 
      ON data_subject_requests (data_subject_email)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_data_subject_requests_identifier 
      ON data_subject_requests (data_subject_identifier)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_data_subject_requests_due_date 
      ON data_subject_requests (due_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_data_subject_requests_assigned 
      ON data_subject_requests (assigned_to)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_data_subject_requests_created 
      ON data_subject_requests (created_at DESC)
    `);

    // Consents table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS consents (
        id                          BIGSERIAL PRIMARY KEY,
        consent_key                 VARCHAR(128) UNIQUE NOT NULL,
        data_subject_id             BIGINT,
        data_subject_email          VARCHAR(255),
        data_subject_type           VARCHAR(64),
        data_subject_identifier     VARCHAR(255),
        consent_type                VARCHAR(64) NOT NULL,
        consent_category            VARCHAR(64),
        consent_purpose             TEXT,
        consent_status              VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        consent_method              VARCHAR(64),
        consent_source              VARCHAR(64),
        consent_version             VARCHAR(32),
        privacy_policy_version      VARCHAR(32),
        terms_version               VARCHAR(32),
        given_at                    TIMESTAMPTZ,
        withdrawn_at                TIMESTAMPTZ,
        expires_at                  TIMESTAMPTZ,
        last_verified_at            TIMESTAMPTZ,
        ip_address                  VARCHAR(45),
        user_agent                  VARCHAR(512),
        device_fingerprint          VARCHAR(128),
        consent_record_hash         VARCHAR(256),
        withdrawal_reason           TEXT,
        withdrawal_method           VARCHAR(64),
        withdrawal_ip_address       VARCHAR(45),
        withdrawal_user_agent       VARCHAR(512),
        organization_id             BIGINT,
        is_tenant_wide              BOOLEAN NOT NULL DEFAULT false,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        metadata                    JSONB,
        CONSTRAINT fk_consents_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_consents_created_by 
          FOREIGN KEY (created_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_consents_updated_by 
          FOREIGN KEY (updated_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_consents_subject_id 
      ON consents (data_subject_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_consents_subject_email 
      ON consents (data_subject_email)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_consents_type 
      ON consents (consent_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_consents_status 
      ON consents (consent_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_consents_category 
      ON consents (consent_category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_consents_given_at 
      ON consents (given_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_consents_expires_at 
      ON consents (expires_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_consents_organization 
      ON consents (organization_id)
    `);

    // Privacy Policy Acceptances table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS privacy_policy_acceptances (
        id                          BIGSERIAL PRIMARY KEY,
        user_id                     BIGINT NOT NULL,
        policy_type                 VARCHAR(64) NOT NULL,
        policy_version              VARCHAR(32) NOT NULL,
        accepted_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
        accepted_via                VARCHAR(64),
        ip_address                  VARCHAR(45),
        user_agent                  VARCHAR(512),
        acceptance_hash              VARCHAR(256),
        withdrawn_at                TIMESTAMPTZ,
        withdrawal_reason           TEXT,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        metadata                    JSONB,
        CONSTRAINT fk_privacy_policy_acceptances_user 
          FOREIGN KEY (user_id) 
          REFERENCES users(id) 
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_privacy_policy_user 
      ON privacy_policy_acceptances (user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_privacy_policy_type 
      ON privacy_policy_acceptances (policy_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_privacy_policy_version 
      ON privacy_policy_acceptances (policy_version)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_privacy_policy_accepted 
      ON privacy_policy_acceptances (accepted_at DESC)
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE data_subject_requests IS 'GDPR data subject requests (access, deletion, portability, etc.)';
      COMMENT ON TABLE consents IS 'Consent tracking and management for GDPR compliance';
      COMMENT ON TABLE privacy_policy_acceptances IS 'Tracks privacy policy and terms acceptance';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS privacy_policy_acceptances`);
    await queryRunner.query(`DROP TABLE IF EXISTS consents`);
    await queryRunner.query(`DROP TABLE IF EXISTS data_subject_requests`);
  }
}
