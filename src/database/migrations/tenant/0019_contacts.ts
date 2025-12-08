import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Contacts Migration
 *
 * This migration creates:
 * - contacts table (unified contact management with types, relationships, segmentation)
 * - contact_relationships table (hierarchical relationships between contacts)
 * - contact_interactions table (interaction history and activity timeline)
 * - Full-text search indexes
 * - Foreign key relationships
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Contacts0000000000019 implements MigrationInterface {
  name = 'Contacts0000000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Contacts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id                          BIGSERIAL PRIMARY KEY,
        contact_key                 VARCHAR(128) UNIQUE,
        contact_number              VARCHAR(64),
        first_name                  VARCHAR(128),
        last_name                   VARCHAR(128),
        full_name                   VARCHAR(255) NOT NULL,
        display_name                VARCHAR(255),
        company_name                VARCHAR(255),
        contact_type                VARCHAR(32) NOT NULL DEFAULT 'PERSON',
        contact_category            VARCHAR(64) NOT NULL DEFAULT 'OTHER',
        contact_status              VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        contact_source              VARCHAR(128),
        email                       VARCHAR(255),
        email_secondary             VARCHAR(255),
        phone                       VARCHAR(32),
        phone_mobile                VARCHAR(32),
        phone_work                  VARCHAR(32),
        phone_fax                   VARCHAR(32),
        website                     VARCHAR(255),
        address_line1               VARCHAR(255),
        address_line2               VARCHAR(255),
        city                        VARCHAR(128),
        state                       VARCHAR(128),
        postal_code                 VARCHAR(32),
        country                     VARCHAR(64),
        address_type                VARCHAR(32),
        organization_id             BIGINT,
        company_size                VARCHAR(32),
        industry                    VARCHAR(128),
        tags                        TEXT,
        notes                       TEXT,
        last_contact_date           DATE,
        last_activity_date           TIMESTAMPTZ,
        next_follow_up_date         DATE,
        contact_metadata            JSONB,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_archived                 BOOLEAN NOT NULL DEFAULT false,
        archived_at                 TIMESTAMPTZ,
        archived_by                 BIGINT,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for contacts
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_key 
      ON contacts (contact_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_number 
      ON contacts (contact_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_type 
      ON contacts (contact_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_category 
      ON contacts (contact_category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_status 
      ON contacts (contact_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_email 
      ON contacts (email)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_organization 
      ON contacts (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_archived 
      ON contacts (is_archived)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_active 
      ON contacts (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_follow_up 
      ON contacts (next_follow_up_date)
    `);

    // Full-text search index (PostgreSQL GIN index for JSONB and text search)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_fulltext 
      ON contacts USING GIN (
        to_tsvector('english', 
          COALESCE(full_name, '') || ' ' || 
          COALESCE(display_name, '') || ' ' || 
          COALESCE(company_name, '') || ' ' || 
          COALESCE(email, '') || ' ' || 
          COALESCE(contact_number, '') || ' ' || 
          COALESCE(tags, '')
        )
      )
    `);

    // Composite indexes for common queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_org_category 
      ON contacts (organization_id, contact_category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_org_status 
      ON contacts (organization_id, contact_status)
    `);

    // Contact Relationships table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contact_relationships (
        id                          BIGSERIAL PRIMARY KEY,
        contact_id                 BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        related_contact_id          BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        relationship_type           VARCHAR(64) NOT NULL,
        relationship_direction      VARCHAR(32) NOT NULL DEFAULT 'BIDIRECTIONAL',
        relationship_strength       VARCHAR(32),
        description                 TEXT,
        start_date                 DATE,
        end_date                   DATE,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT chk_contact_relationships_no_self CHECK (contact_id != related_contact_id)
      )
    `);

    // Create indexes for contact_relationships
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_relationships_contact 
      ON contact_relationships (contact_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_relationships_related 
      ON contact_relationships (related_contact_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_relationships_type 
      ON contact_relationships (relationship_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_relationships_active 
      ON contact_relationships (is_active)
    `);

    // Contact Interactions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contact_interactions (
        id                          BIGSERIAL PRIMARY KEY,
        contact_id                  BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        interaction_type            VARCHAR(32) NOT NULL DEFAULT 'OTHER',
        direction                   VARCHAR(32) NOT NULL DEFAULT 'OUTBOUND',
        subject                     VARCHAR(255) NOT NULL,
        description                 TEXT,
        interaction_date            TIMESTAMPTZ NOT NULL,
        duration                    INTEGER,
        employee_id                 BIGINT,
        related_entity_id            BIGINT,
        related_entity_type         VARCHAR(64),
        outcome                     VARCHAR(128),
        next_action                 TEXT,
        next_follow_up_date         DATE,
        interaction_metadata        JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for contact_interactions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_interactions_contact 
      ON contact_interactions (contact_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_interactions_type 
      ON contact_interactions (interaction_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_interactions_date 
      ON contact_interactions (interaction_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_interactions_direction 
      ON contact_interactions (direction)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_interactions_employee 
      ON contact_interactions (employee_id)
    `);

    // Composite index for contact activity timeline
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contact_interactions_contact_date 
      ON contact_interactions (contact_id, interaction_date DESC)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE contacts IS 'Unified contact management for clients, customers, vendors, leads with relationships, segmentation, and activity tracking'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE contact_relationships IS 'Relationships between contacts (hierarchical and other relationship types)'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE contact_interactions IS 'Interaction history and activity timeline for contacts'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN contacts.contact_type IS 'PERSON, COMPANY'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN contacts.contact_category IS 'CLIENT, CUSTOMER, VENDOR, LEAD, PARTNER, SUPPLIER, OTHER'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN contacts.contact_status IS 'ACTIVE, INACTIVE, ARCHIVED, BLACKLISTED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN contact_relationships.relationship_type IS 'PARENT_COMPANY, SUBSIDIARY, PARTNER, COMPETITOR, RELATED, SAME_COMPANY'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN contact_interactions.interaction_type IS 'EMAIL, PHONE, MEETING, NOTE, TASK, DEAL, SUPPORT, OTHER'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS contact_interactions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS contact_relationships CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS contacts CASCADE`);
  }
}


