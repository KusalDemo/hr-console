import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tenant schema baseline migration
 * This migration creates the core tables for each tenant schema:
 * - users: User accounts within the tenant
 * - roles: Role definitions
 * - user_roles: User-role assignments
 * - organizations: Organizations within the tenant
 * - organization_memberships: User-organization relationships
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 * The schema should already exist before running this migration
 */
export class TenantBaseline0000000000001 implements MigrationInterface {
  name = 'TenantBaseline0000000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table - User accounts within tenant
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                      BIGSERIAL PRIMARY KEY,
        email                   VARCHAR(255) UNIQUE NOT NULL,
        password_hash           VARCHAR(255) NOT NULL,
        full_name               VARCHAR(255) NOT NULL,
        active                  BOOLEAN NOT NULL DEFAULT true,
        is_locked               BOOLEAN NOT NULL DEFAULT false,
        locked_until            TIMESTAMPTZ,
        failed_login_attempts   INTEGER NOT NULL DEFAULT 0,
        last_failed_login_at    TIMESTAMPTZ,
        requires_password_change BOOLEAN NOT NULL DEFAULT false,
        mfa_enabled             BOOLEAN NOT NULL DEFAULT false,
        password_changed_at     TIMESTAMPTZ,
        password_expires_at     TIMESTAMPTZ,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email 
      ON users (email)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_active 
      ON users (active)
    `);

    // Roles table - Role definitions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id                      BIGSERIAL PRIMARY KEY,
        name                    VARCHAR(64) UNIQUE NOT NULL,
        description             TEXT,
        is_system_role          BOOLEAN NOT NULL DEFAULT false,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_roles_name 
      ON roles (name)
    `);

    // User roles junction table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id                 BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
        assigned_by             BIGINT REFERENCES users(id),
        PRIMARY KEY (user_id, role_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_roles_user 
      ON user_roles (user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_roles_role 
      ON user_roles (role_id)
    `);

    // Organizations table - Organizations within tenant
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

    // Organization memberships - Users can belong to multiple organizations
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

    // Organization settings - Per-organization configuration
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

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_settings_org 
      ON organization_settings (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_org_settings_key 
      ON organization_settings (organization_id, setting_key)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE users IS 'User accounts within the tenant'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE roles IS 'Role definitions for RBAC'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE user_roles IS 'User-role assignments for RBAC'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE organizations IS 'Organizations within the tenant with hierarchical support'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE organization_memberships IS 'User-organization relationships with role assignments'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE organization_settings IS 'Per-organization configuration settings'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN organizations.organization_type IS 'COMPANY, DIVISION, DEPARTMENT, SUBSIDIARY, etc.'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN organizations.status IS 'ACTIVE, INACTIVE, ARCHIVED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS organization_settings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS organization_memberships CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS organizations CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_roles CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);
  }
}
