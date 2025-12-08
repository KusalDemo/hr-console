import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enhanced Security Features Migration
 *
 * This migration creates:
 * - password_policies table (configurable password rules)
 * - mfa_configurations table (MFA secrets and configuration)
 * - user_sessions table (active session management)
 * - failed_login_attempts table (failed login tracking)
 * - ip_whitelist table (IP filtering/whitelisting)
 * - security_audit_logs table (security-specific audit logging)
 * - Indexes for performance
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class SecurityEnhanced0000000000052 implements MigrationInterface {
  name = 'SecurityEnhanced0000000000052';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Note: Enhanced security fields are already in users table from baseline migration
    // Add additional indexes if needed
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_locked 
      ON users (is_locked, locked_until) 
      WHERE is_locked = true
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_mfa 
      ON users (mfa_enabled) 
      WHERE mfa_enabled = true
    `);

    // Password Policies table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS password_policies (
        id                          BIGSERIAL PRIMARY KEY,
        policy_key                  VARCHAR(128) UNIQUE NOT NULL,
        policy_name                 VARCHAR(255) NOT NULL,
        description                 TEXT,
        min_length                  INTEGER NOT NULL DEFAULT 8,
        max_length                  INTEGER,
        require_uppercase           BOOLEAN NOT NULL DEFAULT true,
        require_lowercase            BOOLEAN NOT NULL DEFAULT true,
        require_digits               BOOLEAN NOT NULL DEFAULT true,
        require_special_chars        BOOLEAN NOT NULL DEFAULT false,
        special_chars_allowed       VARCHAR(64) DEFAULT '!@#$%^&*()_+-=[]{}|;:,.<>?',
        disallow_common_passwords    BOOLEAN NOT NULL DEFAULT true,
        common_passwords_list        JSONB,
        disallow_username            BOOLEAN NOT NULL DEFAULT true,
        disallow_email              BOOLEAN NOT NULL DEFAULT true,
        max_consecutive_chars        INTEGER NOT NULL DEFAULT 3,
        max_repeating_chars          INTEGER NOT NULL DEFAULT 3,
        prevent_reuse_count          INTEGER,
        prevent_reuse_period_days    INTEGER,
        expiration_days              INTEGER,
        warning_days_before_expiry    INTEGER NOT NULL DEFAULT 7,
        min_complexity_score         INTEGER NOT NULL DEFAULT 3,
        check_password_strength      BOOLEAN NOT NULL DEFAULT true,
        max_failed_attempts          INTEGER NOT NULL DEFAULT 5,
        lockout_duration_minutes     INTEGER NOT NULL DEFAULT 30,
        lockout_escalation_enabled    BOOLEAN NOT NULL DEFAULT false,
        lockout_escalation_multiplier DECIMAL(5,2) DEFAULT 2.0,
        organization_id              BIGINT,
        is_default                   BOOLEAN NOT NULL DEFAULT false,
        is_active                    BOOLEAN NOT NULL DEFAULT true,
        created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                   BIGINT,
        updated_by                   BIGINT,
        CONSTRAINT fk_password_policies_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_password_policies_created_by 
          FOREIGN KEY (created_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_password_policies_updated_by 
          FOREIGN KEY (updated_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_password_policies_active 
      ON password_policies (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_password_policies_default 
      ON password_policies (is_default)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_password_policies_org 
      ON password_policies (organization_id) 
      WHERE organization_id IS NOT NULL
    `);

    // MFA Configurations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mfa_configurations (
        id                          BIGSERIAL PRIMARY KEY,
        user_id                     BIGINT NOT NULL,
        mfa_type                    VARCHAR(32) NOT NULL,
        is_enabled                  BOOLEAN NOT NULL DEFAULT false,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        totp_secret                 VARCHAR(128),
        totp_issuer                 VARCHAR(128) DEFAULT 'HR System',
        backup_codes                JSONB,
        backup_codes_used           JSONB,
        phone_number                VARCHAR(32),
        phone_verified               BOOLEAN NOT NULL DEFAULT false,
        email_verified               BOOLEAN NOT NULL DEFAULT false,
        verified_at                 TIMESTAMPTZ,
        last_used_at                TIMESTAMPTZ,
        failed_attempts              INTEGER NOT NULL DEFAULT 0,
        locked_until                TIMESTAMPTZ,
        device_fingerprint           VARCHAR(128),
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_mfa_configurations_user 
          FOREIGN KEY (user_id) 
          REFERENCES users(id) 
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_user 
      ON mfa_configurations (user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_active 
      ON mfa_configurations (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_type 
      ON mfa_configurations (mfa_type)
    `);

    // User Sessions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id                          BIGSERIAL PRIMARY KEY,
        session_token               VARCHAR(512) UNIQUE NOT NULL,
        user_id                     BIGINT NOT NULL,
        ip_address                  VARCHAR(45),
        user_agent                  VARCHAR(512),
        device_fingerprint           VARCHAR(128),
        device_type                 VARCHAR(32),
        device_name                 VARCHAR(255),
        location_country            VARCHAR(64),
        location_city               VARCHAR(128),
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_trusted                  BOOLEAN NOT NULL DEFAULT false,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_accessed_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at                  TIMESTAMPTZ NOT NULL,
        revoked_at                  TIMESTAMPTZ,
        revoked_by                  BIGINT,
        revoke_reason               VARCHAR(255),
        metadata                    JSONB,
        CONSTRAINT fk_user_sessions_user 
          FOREIGN KEY (user_id) 
          REFERENCES users(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_user_sessions_revoked_by 
          FOREIGN KEY (revoked_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user 
      ON user_sessions (user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_token 
      ON user_sessions (session_token)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_active 
      ON user_sessions (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_expires 
      ON user_sessions (expires_at)
    `);

    // Failed Login Attempts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS failed_login_attempts (
        id                          BIGSERIAL PRIMARY KEY,
        email                       VARCHAR(255),
        user_id                     BIGINT,
        ip_address                  VARCHAR(45),
        user_agent                  VARCHAR(512),
        failure_reason              VARCHAR(128),
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_failed_login_attempts_user 
          FOREIGN KEY (user_id) 
          REFERENCES users(id) 
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_failed_logins_user 
      ON failed_login_attempts (user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_failed_logins_email 
      ON failed_login_attempts (email)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_failed_logins_ip 
      ON failed_login_attempts (ip_address)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_failed_logins_created 
      ON failed_login_attempts (created_at)
    `);

    // IP Whitelist table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ip_whitelist (
        id                          BIGSERIAL PRIMARY KEY,
        ip_address                  VARCHAR(45) NOT NULL,
        ip_range_start              VARCHAR(45),
        ip_range_end                VARCHAR(45),
        description                 TEXT,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        organization_id             BIGINT,
        user_id                     BIGINT,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        CONSTRAINT fk_ip_whitelist_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_ip_whitelist_user 
          FOREIGN KEY (user_id) 
          REFERENCES users(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_ip_whitelist_created_by 
          FOREIGN KEY (created_by) 
          REFERENCES users(id) 
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ip_whitelist_ip 
      ON ip_whitelist (ip_address)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ip_whitelist_active 
      ON ip_whitelist (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ip_whitelist_org 
      ON ip_whitelist (organization_id) 
      WHERE organization_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ip_whitelist_user 
      ON ip_whitelist (user_id) 
      WHERE user_id IS NOT NULL
    `);

    // Security Audit Logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id                          BIGSERIAL PRIMARY KEY,
        audit_type                  VARCHAR(64) NOT NULL,
        user_id                     BIGINT,
        ip_address                  VARCHAR(45),
        user_agent                  VARCHAR(512),
        action                      VARCHAR(128),
        action_status               VARCHAR(32),
        details                     JSONB,
        risk_level                  VARCHAR(32),
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_security_audit_logs_user 
          FOREIGN KEY (user_id) 
          REFERENCES users(id) 
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_security_audit_type 
      ON security_audit_logs (audit_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_security_audit_user 
      ON security_audit_logs (user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_security_audit_status 
      ON security_audit_logs (action_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_security_audit_risk 
      ON security_audit_logs (risk_level)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_security_audit_created 
      ON security_audit_logs (created_at DESC)
    `);

    // Insert default password policy
    await queryRunner.query(`
      INSERT INTO password_policies (
        policy_key, 
        policy_name, 
        description, 
        min_length, 
        require_uppercase, 
        require_lowercase, 
        require_digits, 
        disallow_common_passwords, 
        disallow_username, 
        disallow_email, 
        max_failed_attempts, 
        lockout_duration_minutes, 
        is_default, 
        is_active
      ) VALUES (
        'default', 
        'Default Password Policy', 
        'Default password policy for all users', 
        8, 
        true, 
        true, 
        true, 
        true, 
        true, 
        true, 
        5, 
        30, 
        true, 
        true
      )
      ON CONFLICT (policy_key) DO NOTHING
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE password_policies IS 'Configurable password rules for security compliance';
      COMMENT ON TABLE mfa_configurations IS 'Multi-factor authentication configuration and secrets';
      COMMENT ON TABLE user_sessions IS 'Active session management with device tracking';
      COMMENT ON TABLE failed_login_attempts IS 'Tracks failed login attempts for account lockout';
      COMMENT ON TABLE ip_whitelist IS 'IP filtering/whitelisting for access control';
      COMMENT ON TABLE security_audit_logs IS 'Security-specific audit logging';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS security_audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS ip_whitelist`);
    await queryRunner.query(`DROP TABLE IF EXISTS failed_login_attempts`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_sessions`);
    await queryRunner.query(`DROP TABLE IF EXISTS mfa_configurations`);
    await queryRunner.query(`DROP TABLE IF EXISTS password_policies`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_mfa`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_locked`);
  }
}


