import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Document Management System Migration
 *
 * This migration creates:
 * - documents table (document metadata, storage paths, versions, lifecycle)
 * - document_versions table (version history)
 * - document_shares table (sharing and permissions)
 * - Indexes for performance optimization
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Documents0000000000043 implements MigrationInterface {
  name = 'Documents0000000000043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Documents table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id                          BIGSERIAL PRIMARY KEY,
        document_key                VARCHAR(128) UNIQUE NOT NULL,
        document_name               VARCHAR(255) NOT NULL,
        document_type               VARCHAR(64) NOT NULL,
        document_category           VARCHAR(128),
        file_name                   VARCHAR(255) NOT NULL,
        file_path                   VARCHAR(512) NOT NULL,
        file_size                   BIGINT NOT NULL,
        mime_type                   VARCHAR(128),
        file_hash                   VARCHAR(64),
        file_extension              VARCHAR(32),
        current_version             INTEGER NOT NULL DEFAULT 1,
        version_count               INTEGER NOT NULL DEFAULT 1,
        is_latest_version           BOOLEAN NOT NULL DEFAULT true,
        parent_document_id          BIGINT,
        folder_path                 VARCHAR(1024),
        description                 TEXT,
        content                     TEXT,
        content_summary             TEXT,
        tags                        JSONB,
        labels                      JSONB,
        custom_fields               JSONB,
        document_status             VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
        document_stage              VARCHAR(32),
        owner_id                    BIGINT NOT NULL,
        organization_id             BIGINT,
        is_public                   BOOLEAN NOT NULL DEFAULT false,
        is_shared                   BOOLEAN NOT NULL DEFAULT false,
        sharing_enabled             BOOLEAN NOT NULL DEFAULT true,
        access_control              JSONB,
        template_id                 BIGINT,
        entity_type                 VARCHAR(128),
        entity_id                   BIGINT,
        storage_provider            VARCHAR(64) NOT NULL DEFAULT 'LOCAL',
        storage_location            VARCHAR(512),
        storage_metadata            JSONB,
        is_encrypted                BOOLEAN NOT NULL DEFAULT false,
        encryption_key_id           VARCHAR(128),
        is_password_protected       BOOLEAN NOT NULL DEFAULT false,
        is_indexed                  BOOLEAN NOT NULL DEFAULT true,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT NOT NULL,
        updated_by                  BIGINT,
        CONSTRAINT fk_documents_owner 
          FOREIGN KEY (owner_id) 
          REFERENCES employees(id) 
          ON DELETE RESTRICT,
        CONSTRAINT fk_documents_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_documents_parent 
          FOREIGN KEY (parent_document_id) 
          REFERENCES documents(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_documents_template 
          FOREIGN KEY (template_id) 
          REFERENCES documents(id) 
          ON DELETE SET NULL
      )
    `);

    // Create indexes for documents
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_key 
      ON documents (document_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_type 
      ON documents (document_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_status 
      ON documents (document_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_owner 
      ON documents (owner_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_entity 
      ON documents (entity_type, entity_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_category 
      ON documents (document_category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_parent 
      ON documents (parent_document_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_template 
      ON documents (template_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_organization 
      ON documents (organization_id)
    `);

    // Document Versions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_versions (
        id                          BIGSERIAL PRIMARY KEY,
        document_id                 BIGINT NOT NULL,
        version_number              INTEGER NOT NULL,
        file_path                   VARCHAR(512) NOT NULL,
        file_name                   VARCHAR(255) NOT NULL,
        file_size                   BIGINT NOT NULL,
        mime_type                   VARCHAR(128),
        file_hash                   VARCHAR(64),
        change_description          TEXT,
        is_current                  BOOLEAN NOT NULL DEFAULT false,
        created_by                  BIGINT NOT NULL,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_document_versions_document 
          FOREIGN KEY (document_id) 
          REFERENCES documents(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_document_versions_created_by 
          FOREIGN KEY (created_by) 
          REFERENCES employees(id) 
          ON DELETE SET NULL,
        CONSTRAINT uk_document_versions_doc_version 
          UNIQUE (document_id, version_number)
      )
    `);

    // Create indexes for document_versions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_versions_document 
      ON document_versions (document_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_versions_version 
      ON document_versions (document_id, version_number)
    `);

    // Document Shares table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_shares (
        id                          BIGSERIAL PRIMARY KEY,
        document_id                 BIGINT NOT NULL,
        shared_with_id              BIGINT,
        shared_with_role            VARCHAR(64),
        permissions                 JSONB NOT NULL,
        share_link                  VARCHAR(512),
        share_token                 VARCHAR(128),
        expires_at                  TIMESTAMPTZ,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        share_password              VARCHAR(255),
        access_count                INTEGER NOT NULL DEFAULT 0,
        last_accessed_at            TIMESTAMPTZ,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT NOT NULL,
        CONSTRAINT fk_document_shares_document 
          FOREIGN KEY (document_id) 
          REFERENCES documents(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_document_shares_shared_with 
          FOREIGN KEY (shared_with_id) 
          REFERENCES employees(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_document_shares_created_by 
          FOREIGN KEY (created_by) 
          REFERENCES employees(id) 
          ON DELETE RESTRICT
      )
    `);

    // Create indexes for document_shares
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_shares_document 
      ON document_shares (document_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_shares_user 
      ON document_shares (shared_with_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_shares_active 
      ON document_shares (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_shares_token 
      ON document_shares (share_token)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_document_shares_token
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_document_shares_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_document_shares_user
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_document_shares_document
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_document_versions_version
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_document_versions_document
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_documents_organization
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_documents_template
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_documents_parent
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_documents_category
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_documents_entity
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_documents_owner
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_documents_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_documents_type
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_documents_key
    `);

    // Drop tables
    await queryRunner.query(`
      DROP TABLE IF EXISTS document_shares CASCADE
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS document_versions CASCADE
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS documents CASCADE
    `);
  }
}
