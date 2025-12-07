import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Leads Migration
 *
 * This migration creates:
 * - leads table (lead pipeline and conversion tracking with scoring, source attribution, campaign tracking)
 * - lead_scoring_rules table (automated scoring rules for leads)
 * - Full-text search indexes
 * - Foreign key relationships
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Leads0000000000020 implements MigrationInterface {
  name = 'Leads0000000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Leads table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id                          BIGSERIAL PRIMARY KEY,
        lead_number                 VARCHAR(64) UNIQUE,
        first_name                  VARCHAR(128),
        last_name                   VARCHAR(128),
        full_name                   VARCHAR(255) NOT NULL,
        display_name                VARCHAR(255),
        company_name                VARCHAR(255),
        job_title                   VARCHAR(128),
        email                       VARCHAR(255),
        email_secondary             VARCHAR(255),
        phone                       VARCHAR(32),
        phone_mobile                VARCHAR(32),
        website                     VARCHAR(255),
        address_line1               VARCHAR(255),
        address_line2               VARCHAR(255),
        city                        VARCHAR(128),
        state                       VARCHAR(128),
        postal_code                 VARCHAR(32),
        country                     VARCHAR(64),
        lead_status                 VARCHAR(32) NOT NULL DEFAULT 'NEW',
        lead_source                 VARCHAR(32) NOT NULL DEFAULT 'OTHER',
        lead_priority               VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
        lead_score                  INTEGER NOT NULL DEFAULT 0,
        last_score_calculation      TIMESTAMPTZ,
        assigned_to                 BIGINT,
        organization_id             BIGINT,
        campaign_id                 BIGINT,
        campaign_name               VARCHAR(255),
        industry                    VARCHAR(128),
        company_size                VARCHAR(32),
        estimated_value             DECIMAL(15, 2),
        currency_code               VARCHAR(3) DEFAULT 'USD',
        expected_close_date         DATE,
        actual_close_date           DATE,
        conversion_date             TIMESTAMPTZ,
        converted_contact_id        BIGINT,
        conversion_reason          VARCHAR(255),
        loss_reason                 VARCHAR(255),
        rejection_reason            VARCHAR(255),
        tags                        TEXT,
        notes                       TEXT,
        last_contact_date           DATE,
        next_follow_up_date         DATE,
        lead_metadata               JSONB,
        is_converted                BOOLEAN NOT NULL DEFAULT false,
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

    // Create indexes for leads
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_number 
      ON leads (lead_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_status 
      ON leads (lead_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_source 
      ON leads (lead_source)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_priority 
      ON leads (lead_priority)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_score 
      ON leads (lead_score)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_assigned 
      ON leads (assigned_to)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_organization 
      ON leads (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_campaign 
      ON leads (campaign_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_converted 
      ON leads (is_converted)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_archived 
      ON leads (is_archived)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_active 
      ON leads (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_email 
      ON leads (email)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_follow_up 
      ON leads (next_follow_up_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_expected_close 
      ON leads (expected_close_date)
    `);

    // Full-text search index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_fulltext 
      ON leads USING GIN (
        to_tsvector('english', 
          COALESCE(full_name, '') || ' ' || 
          COALESCE(display_name, '') || ' ' || 
          COALESCE(company_name, '') || ' ' || 
          COALESCE(email, '') || ' ' || 
          COALESCE(lead_number, '') || ' ' || 
          COALESCE(tags, '')
        )
      )
    `);

    // Composite indexes for common queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_org_status 
      ON leads (organization_id, lead_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_org_source 
      ON leads (organization_id, lead_source)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_status_score 
      ON leads (lead_status, lead_score DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leads_assigned_status 
      ON leads (assigned_to, lead_status)
    `);

    // Foreign key to contacts (if contacts table exists)
    // Note: This will be added after contacts migration, but we check for it
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
          ALTER TABLE leads 
          ADD CONSTRAINT fk_leads_converted_contact 
          FOREIGN KEY (converted_contact_id) 
          REFERENCES contacts(id) 
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Lead Scoring Rules table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lead_scoring_rules (
        id                          BIGSERIAL PRIMARY KEY,
        rule_name                   VARCHAR(255) NOT NULL,
        rule_description            TEXT,
        rule_type                   VARCHAR(32) NOT NULL DEFAULT 'FIELD_MATCH',
        field_name                  VARCHAR(128),
        operator                    VARCHAR(32),
        field_value                 TEXT,
        custom_expression           TEXT,
        score_points                INTEGER NOT NULL DEFAULT 0,
        priority                    INTEGER NOT NULL DEFAULT 0,
        organization_id             BIGINT,
        activation_date             TIMESTAMPTZ,
        expiration_date             TIMESTAMPTZ,
        max_score_cap               INTEGER,
        min_score_floor             INTEGER,
        rule_metadata               JSONB,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for lead_scoring_rules
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_active 
      ON lead_scoring_rules (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_priority 
      ON lead_scoring_rules (priority)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_organization 
      ON lead_scoring_rules (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_type 
      ON lead_scoring_rules (rule_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_activation 
      ON lead_scoring_rules (activation_date, expiration_date)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE leads IS 'Lead pipeline and conversion tracking with scoring, source attribution, campaign tracking'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE lead_scoring_rules IS 'Automated scoring rules for leads with conditions, actions, and priority'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN leads.lead_status IS 'NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST, NURTURING, DISQUALIFIED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN leads.lead_source IS 'WEBSITE, REFERRAL, SOCIAL_MEDIA, EMAIL_CAMPAIGN, TRADE_SHOW, PARTNER, ADVERTISING, DIRECT, OTHER'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN leads.lead_priority IS 'LOW, MEDIUM, HIGH, URGENT'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN lead_scoring_rules.rule_type IS 'FIELD_MATCH, FIELD_RANGE, BEHAVIOR, ENGAGEMENT, CUSTOM'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN lead_scoring_rules.operator IS 'EQUALS, NOT_EQUALS, CONTAINS, NOT_CONTAINS, STARTS_WITH, ENDS_WITH, GREATER_THAN, LESS_THAN, GREATER_THAN_OR_EQUAL, LESS_THAN_OR_EQUAL, BETWEEN, IN, NOT_IN, IS_NULL, IS_NOT_NULL'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS lead_scoring_rules CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS leads CASCADE`);
  }
}
