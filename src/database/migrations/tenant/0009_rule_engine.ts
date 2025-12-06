import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rule Engine Migration
 * 
 * This migration creates:
 * - business_rules table (rule definitions with conditions and actions)
 * - rule_execution_logs table (audit trail of rule executions)
 * - Indexes for performance
 * - Foreign key relationships
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class RuleEngine0000000000009 implements MigrationInterface {
  name = 'RuleEngine0000000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Business Rules table - Rule definitions with conditions and actions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS business_rules (
        id                          BIGSERIAL PRIMARY KEY,
        rule_key                    VARCHAR(128) UNIQUE NOT NULL,
        rule_name                   VARCHAR(255) NOT NULL,
        rule_type                   VARCHAR(32) NOT NULL,
        entity_type                 VARCHAR(128),
        trigger_type                VARCHAR(32) NOT NULL,
        trigger_events              JSONB,
        conditions                  JSONB NOT NULL,
        actions                     JSONB NOT NULL,
        priority                    INTEGER NOT NULL DEFAULT 100,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        activation_date             TIMESTAMPTZ,
        expiration_date             TIMESTAMPTZ,
        organization_id             BIGINT,
        tenant_scope                VARCHAR(32) NOT NULL DEFAULT 'ALL',
        execution_mode              VARCHAR(32) NOT NULL DEFAULT 'SYNCHRONOUS',
        stop_on_match               BOOLEAN NOT NULL DEFAULT false,
        description                 TEXT,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for business_rules
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_business_rules_key 
      ON business_rules (rule_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_business_rules_type 
      ON business_rules (rule_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_business_rules_entity_type 
      ON business_rules (entity_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_business_rules_trigger 
      ON business_rules (trigger_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_business_rules_active 
      ON business_rules (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_business_rules_priority 
      ON business_rules (priority)
    `);

    // Rule Execution Logs table - Audit trail of rule executions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rule_execution_logs (
        id                          BIGSERIAL PRIMARY KEY,
        business_rule_id            BIGINT NOT NULL REFERENCES business_rules(id) ON DELETE CASCADE,
        entity_type                 VARCHAR(128),
        entity_id                   BIGINT,
        trigger_event               VARCHAR(64),
        execution_status            VARCHAR(32) NOT NULL,
        condition_result            BOOLEAN NOT NULL DEFAULT false,
        actions_executed            BOOLEAN NOT NULL DEFAULT false,
        execution_time_ms           BIGINT,
        input_data                  JSONB,
        output_data                 JSONB,
        error_message               TEXT,
        error_stack_trace           TEXT,
        triggered_by                BIGINT,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Create indexes for rule_execution_logs
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rule_logs_rule 
      ON rule_execution_logs (business_rule_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rule_logs_entity 
      ON rule_execution_logs (entity_type, entity_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rule_logs_status 
      ON rule_execution_logs (execution_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rule_logs_created 
      ON rule_execution_logs (created_at)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE business_rules IS 'Business rule definitions with conditions, actions, and triggers'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE rule_execution_logs IS 'Audit trail of rule executions with results and errors'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN business_rules.rule_type IS 'VALIDATION, TRANSFORMATION, NOTIFICATION, CALCULATION, WORKFLOW, AUDIT, BUSINESS_LOGIC, INTEGRATION'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN business_rules.trigger_type IS 'EVENT, SCHEDULED, MANUAL, API, CONDITIONAL'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN business_rules.tenant_scope IS 'ALL, ORGANIZATION, DEPARTMENT, USER'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN business_rules.execution_mode IS 'SYNCHRONOUS, ASYNCHRONOUS, SCHEDULED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN business_rules.conditions IS 'JSON object with condition expressions (JSONPath/SpEL-like)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN business_rules.actions IS 'JSON object with actions to execute when conditions match'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN rule_execution_logs.execution_status IS 'SUCCESS, FAILED, CONDITION_NOT_MET, SKIPPED, ERROR'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS rule_execution_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS business_rules CASCADE`);
  }
}

