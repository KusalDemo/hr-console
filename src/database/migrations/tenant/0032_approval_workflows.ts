import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Configurable Approval Workflows Migration
 *
 * This migration creates:
 * - approval_delegations table (delegation of approval authority)
 * - Indexes for performance optimization
 * - Foreign key relationships
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class ApprovalWorkflows0000000000032 implements MigrationInterface {
  name = 'ApprovalWorkflows0000000000032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Approval Delegations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS approval_delegations (
        id                          BIGSERIAL PRIMARY KEY,
        delegator_id                BIGINT NOT NULL,
        delegate_id                 BIGINT NOT NULL,
        workflow_key                VARCHAR(128),
        entity_type                 VARCHAR(128),
        effective_start_date        DATE NOT NULL,
        effective_end_date          DATE,
        delegation_scope            JSONB,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_automatic                BOOLEAN NOT NULL DEFAULT false,
        auto_delegation_rule         JSONB,
        notes                       TEXT,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_approval_delegations_delegator 
          FOREIGN KEY (delegator_id) 
          REFERENCES employees(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_approval_delegations_delegate 
          FOREIGN KEY (delegate_id) 
          REFERENCES employees(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for approval_delegations
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_approval_delegations_delegator 
      ON approval_delegations (delegator_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_approval_delegations_delegate 
      ON approval_delegations (delegate_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_approval_delegations_active 
      ON approval_delegations (is_active, effective_start_date, effective_end_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_approval_delegations_workflow 
      ON approval_delegations (workflow_key) 
      WHERE workflow_key IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_approval_delegations_entity_type 
      ON approval_delegations (entity_type) 
      WHERE entity_type IS NOT NULL
    `);

    // Composite index for active delegation lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_approval_delegations_active_lookup 
      ON approval_delegations (delegator_id, is_active, workflow_key, entity_type, effective_start_date, effective_end_date)
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE approval_delegations IS 'Delegation of approval authority with delegation rules, escalation policies, auto-approval thresholds, and routing based on department/amount/duration';
      COMMENT ON COLUMN approval_delegations.delegation_scope IS 'JSON: scope of delegation (departments, amount thresholds, duration thresholds, approval levels)';
      COMMENT ON COLUMN approval_delegations.auto_delegation_rule IS 'JSON: rules for automatic delegation (e.g., out of office triggers)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop approval_delegations table
    await queryRunner.query(`DROP TABLE IF EXISTS approval_delegations CASCADE`);
  }
}
