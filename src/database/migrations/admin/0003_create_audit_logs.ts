import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs0000000000003 implements MigrationInterface {
  name = 'CreateAuditLogs0000000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Audit Logs - System-wide audit logging for admin schema
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin.audit_logs (
        id                      BIGSERIAL PRIMARY KEY,
        event_type              VARCHAR(64) NOT NULL,
        entity_type             VARCHAR(128),
        entity_id               BIGINT,
        action                  VARCHAR(64) NOT NULL,
        action_status           VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
        user_id                 BIGINT,
        user_type               VARCHAR(32),
        user_email              VARCHAR(255),
        tenant_id               BIGINT REFERENCES admin.tenants(id) ON DELETE SET NULL,
        ip_address              VARCHAR(45),
        user_agent              TEXT,
        request_method          VARCHAR(16),
        request_path            VARCHAR(512),
        request_body            JSONB,
        response_status         INTEGER,
        error_message           TEXT,
        changes                 JSONB,
        metadata                JSONB,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Indexes for common queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type 
      ON admin.audit_logs (event_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
      ON admin.audit_logs (entity_type, entity_id) 
      WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
      ON admin.audit_logs (user_id) 
      WHERE user_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email 
      ON admin.audit_logs (user_email) 
      WHERE user_email IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id 
      ON admin.audit_logs (tenant_id) 
      WHERE tenant_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action_status 
      ON admin.audit_logs (action_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
      ON admin.audit_logs (created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address 
      ON admin.audit_logs (ip_address) 
      WHERE ip_address IS NOT NULL
    `);

    // Composite index for time-range queries with filters
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created 
      ON admin.audit_logs (tenant_id, created_at DESC) 
      WHERE tenant_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created 
      ON admin.audit_logs (user_id, created_at DESC) 
      WHERE user_id IS NOT NULL
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE admin.audit_logs IS 'System-wide audit logging for security and compliance tracking'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN admin.audit_logs.event_type IS 'Type of event: LOGIN, LOGOUT, CREATE, UPDATE, DELETE, PERMISSION_CHANGE, etc.'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN admin.audit_logs.action_status IS 'SUCCESS, FAILED, DENIED, ERROR'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN admin.audit_logs.user_type IS 'SUPER_ADMIN, TENANT_ADMIN, USER'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN admin.audit_logs.changes IS 'JSON object tracking what fields changed (for UPDATE events)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS admin.audit_logs CASCADE`);
  }
}
