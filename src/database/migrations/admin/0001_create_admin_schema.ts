import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminSchema0000000000001 implements MigrationInterface {
  name = 'CreateAdminSchema0000000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create admin schema
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS admin`);

    // Tenants registry table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin.tenants (
        id              BIGSERIAL PRIMARY KEY,
        tenant_key      VARCHAR(64) UNIQUE NOT NULL,
        name            VARCHAR(255) NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        is_active       BOOLEAN NOT NULL DEFAULT true
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenants_active 
      ON admin.tenants (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenants_key 
      ON admin.tenants (tenant_key)
    `);

    // Super admin table (for system super administrators)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin.super_admin (
        id                      BIGSERIAL PRIMARY KEY,
        email                   VARCHAR(255) UNIQUE NOT NULL,
        password_hash           VARCHAR(255) NOT NULL,
        full_name               VARCHAR(255) NOT NULL,
        is_active               BOOLEAN NOT NULL DEFAULT true,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        password_changed_at     TIMESTAMPTZ,
        password_expires_at     TIMESTAMPTZ,
        is_locked               BOOLEAN NOT NULL DEFAULT false,
        locked_until            TIMESTAMPTZ,
        failed_login_attempts   INTEGER NOT NULL DEFAULT 0,
        last_failed_login_at    TIMESTAMPTZ,
        requires_password_change BOOLEAN NOT NULL DEFAULT false,
        mfa_enabled             BOOLEAN NOT NULL DEFAULT false
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_super_admin_email 
      ON admin.super_admin (email)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_super_admin_active 
      ON admin.super_admin (is_active)
    `);

    // Tenant admin table (tenant administrators linked to their tenants)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin.tenant_admin (
        id                      BIGSERIAL PRIMARY KEY,
        tenant_id               BIGINT NOT NULL REFERENCES admin.tenants(id) ON DELETE CASCADE,
        email                   VARCHAR(255) NOT NULL,
        password_hash           VARCHAR(255) NOT NULL,
        full_name               VARCHAR(255) NOT NULL,
        is_active               BOOLEAN NOT NULL DEFAULT true,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        password_changed_at     TIMESTAMPTZ,
        password_expires_at     TIMESTAMPTZ,
        is_locked               BOOLEAN NOT NULL DEFAULT false,
        locked_until            TIMESTAMPTZ,
        failed_login_attempts   INTEGER NOT NULL DEFAULT 0,
        last_failed_login_at    TIMESTAMPTZ,
        requires_password_change BOOLEAN NOT NULL DEFAULT false,
        mfa_enabled             BOOLEAN NOT NULL DEFAULT false,
        UNIQUE(tenant_id, email)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_admin_tenant_id 
      ON admin.tenant_admin (tenant_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_admin_email 
      ON admin.tenant_admin (email)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_admin_active 
      ON admin.tenant_admin (is_active)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON SCHEMA admin IS 'Admin schema for system administrators and tenant management'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE admin.tenants IS 'Registry of all tenants in the system'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE admin.super_admin IS 'System super administrators who manage the platform'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE admin.tenant_admin IS 'Tenant administrators linked to their specific tenants'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS admin.tenant_admin CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS admin.super_admin CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS admin.tenants CASCADE`);
    
    // Drop schema (only if empty)
    await queryRunner.query(`DROP SCHEMA IF EXISTS admin CASCADE`);
  }
}

