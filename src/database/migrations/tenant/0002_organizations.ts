import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Organizations Migration & Seeding
 *
 * This migration:
 * - Ensures all organization-related tables exist (idempotent)
 * - Adds any missing indexes or constraints
 * - Seeds default organization data if none exists
 * - Creates default organization settings
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 * It's safe to run on existing tenants as it checks for existing data.
 */
export class Organizations0000000000002 implements MigrationInterface {
  name = 'Organizations0000000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure organizations table exists (should already exist from baseline)
    // This is idempotent - won't fail if table already exists
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id                      BIGSERIAL PRIMARY KEY,
        organization_key        VARCHAR(128) UNIQUE NOT NULL,
        name                    VARCHAR(255) NOT NULL,
        display_name            VARCHAR(255),
        description             TEXT,
        parent_organization_id   BIGINT REFERENCES organizations(id) ON DELETE SET NULL,
        organization_type       VARCHAR(64) NOT NULL DEFAULT 'COMPANY',
        status                  VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        address_line1           VARCHAR(255),
        address_line2           VARCHAR(255),
        city                    VARCHAR(128),
        state                   VARCHAR(128),
        postal_code             VARCHAR(32),
        country                 VARCHAR(64),
        phone                   VARCHAR(32),
        email                   VARCHAR(255),
        website                 VARCHAR(255),
        tax_id                  VARCHAR(128),
        registration_number     VARCHAR(128),
        is_default              BOOLEAN NOT NULL DEFAULT false,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by              BIGINT REFERENCES users(id),
        updated_by              BIGINT REFERENCES users(id)
      )
    `);

    // Ensure organization_memberships table exists
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organization_memberships (
        id                      BIGSERIAL PRIMARY KEY,
        user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organization_id         BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        role                    VARCHAR(64),
        is_primary              BOOLEAN NOT NULL DEFAULT false,
        joined_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
        left_at                 TIMESTAMPTZ,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(user_id, organization_id)
      )
    `);

    // Ensure organization_settings table exists
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organization_settings (
        id                      BIGSERIAL PRIMARY KEY,
        organization_id         BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        setting_key             VARCHAR(128) NOT NULL,
        setting_value           TEXT,
        setting_type            VARCHAR(32) NOT NULL DEFAULT 'STRING',
        category                VARCHAR(64),
        description             TEXT,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(organization_id, setting_key)
      )
    `);

    // Add missing indexes if they don't exist
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_organizations_key 
      ON organizations (organization_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_organizations_parent 
      ON organizations (parent_organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_organizations_type 
      ON organizations (organization_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_organizations_status 
      ON organizations (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_organizations_default 
      ON organizations (is_default) WHERE is_default = true
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_memberships_user 
      ON organization_memberships (user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_memberships_org 
      ON organization_memberships (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_memberships_primary 
      ON organization_memberships (is_primary) WHERE is_primary = true
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_memberships_active 
      ON organization_memberships (left_at) WHERE left_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_settings_org 
      ON organization_settings (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_settings_key 
      ON organization_settings (organization_id, setting_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_settings_category 
      ON organization_settings (organization_id, category)
    `);

    // Add created_at and updated_at to organization_memberships if they don't exist
    // (TypeORM entities expect these columns)
    // This is a safety check for tenants created with older migrations
    try {
      const hasCreatedAt = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = current_schema()
        AND table_name = 'organization_memberships' 
        AND column_name = 'created_at'
      `);

      if (hasCreatedAt.length === 0) {
        await queryRunner.query(`
          ALTER TABLE organization_memberships 
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        `);
      }

      const hasUpdatedAt = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = current_schema()
        AND table_name = 'organization_memberships' 
        AND column_name = 'updated_at'
      `);

      if (hasUpdatedAt.length === 0) {
        await queryRunner.query(`
          ALTER TABLE organization_memberships 
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        `);
      }
    } catch (error) {
      // If table doesn't exist yet, that's okay - baseline migration will create it with columns
      // This is just a safety check for existing tenants
    }

    // Seed default organization if none exists
    // This is useful for existing tenants that were created before organizations were added
    const existingDefaultOrg = await queryRunner.query(`
      SELECT id FROM organizations WHERE is_default = true LIMIT 1
    `);

    if (existingDefaultOrg.length === 0) {
      // Check if any organization exists
      const anyOrg = await queryRunner.query(`
        SELECT id FROM organizations LIMIT 1
      `);

      if (anyOrg.length === 0) {
        // No organizations exist, create a default one
        // Try to get tenant name from context or use default
        const defaultOrgName = 'Default Organization';
        const defaultOrgKey = 'default-organization';

        // Check if key already exists (shouldn't, but be safe)
        const keyExists = await queryRunner.query(
          `
          SELECT id FROM organizations WHERE organization_key = $1
        `,
          [defaultOrgKey],
        );

        if (keyExists.length === 0) {
          await queryRunner.query(
            `
            INSERT INTO organizations (
              organization_key, name, display_name, organization_type, status,
              is_default, created_at, updated_at
            )
            VALUES ($1, $2, $3, 'COMPANY', 'ACTIVE', true, now(), now())
          `,
            [defaultOrgKey, defaultOrgName, defaultOrgName],
          );

          // Get the created organization ID
          const createdOrg = await queryRunner.query(
            `
            SELECT id FROM organizations WHERE organization_key = $1
          `,
            [defaultOrgKey],
          );

          if (createdOrg.length > 0) {
            const orgId = createdOrg[0].id;

            // Seed default organization settings
            await queryRunner.query(
              `
              INSERT INTO organization_settings (
                organization_id, setting_key, setting_value, setting_type,
                category, description, created_at, updated_at
              )
              VALUES
                ($1, 'timezone', 'UTC', 'STRING', 'general', 'Organization timezone', now(), now()),
                ($1, 'date_format', 'YYYY-MM-DD', 'STRING', 'general', 'Date format preference', now(), now()),
                ($1, 'time_format', '24h', 'STRING', 'general', 'Time format preference (12h or 24h)', now(), now()),
                ($1, 'currency', 'USD', 'STRING', 'general', 'Default currency code', now(), now()),
                ($1, 'locale', 'en-US', 'STRING', 'general', 'Default locale', now(), now())
              ON CONFLICT (organization_id, setting_key) DO NOTHING
            `,
              [orgId],
            );
          }
        }
      } else {
        // Organizations exist but none is marked as default
        // Set the first organization as default
        await queryRunner.query(`
          UPDATE organizations 
          SET is_default = true, updated_at = now()
          WHERE id = (SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1)
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove default organization settings (but keep the organization)
    await queryRunner.query(`
      DELETE FROM organization_settings
      WHERE organization_id IN (
        SELECT id FROM organizations WHERE is_default = true
      )
      AND setting_key IN ('timezone', 'date_format', 'time_format', 'currency', 'locale')
    `);

    // Unset default flag (but don't delete organizations)
    await queryRunner.query(`
      UPDATE organizations SET is_default = false WHERE is_default = true
    `);

    // Note: We don't drop the tables here as they might be needed
    // The baseline migration handles table drops
  }
}
