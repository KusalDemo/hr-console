import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Workflow Engine Migration
 *
 * This migration creates:
 * - workflow_definitions table (workflow definitions with JSON-based state machine)
 * - workflow_instances table (active workflow executions)
 * - workflow_transitions table (transition history)
 * - workflow_approvals table (approval steps)
 * - Indexes for performance
 * - Foreign key relationships
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class WorkflowEngine0000000000008 implements MigrationInterface {
  name = 'WorkflowEngine0000000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Workflow Definitions table - Defines workflows with JSON-based state machines
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_definitions (
        id                          BIGSERIAL PRIMARY KEY,
        workflow_key                VARCHAR(128) UNIQUE NOT NULL,
        workflow_name               VARCHAR(255) NOT NULL,
        entity_type                 VARCHAR(128) NOT NULL,
        description                 TEXT,
        workflow_definition         JSONB NOT NULL,
        version                     INTEGER NOT NULL DEFAULT 1,
        is_default                  BOOLEAN NOT NULL DEFAULT false,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        organization_id             BIGINT,
        workflow_metadata           JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for workflow_definitions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_def_key 
      ON workflow_definitions (workflow_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_def_entity_type 
      ON workflow_definitions (entity_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_def_active 
      ON workflow_definitions (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_def_default 
      ON workflow_definitions (entity_type, is_default, is_active)
    `);

    // Workflow Instances table - Active workflow executions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_instances (
        id                          BIGSERIAL PRIMARY KEY,
        workflow_definition_id      BIGINT NOT NULL REFERENCES workflow_definitions(id) ON DELETE RESTRICT,
        entity_type                 VARCHAR(128) NOT NULL,
        entity_id                   BIGINT NOT NULL,
        current_state               VARCHAR(128) NOT NULL,
        status                      VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        workflow_data               JSONB,
        organization_id             BIGINT,
        started_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        completed_at                TIMESTAMPTZ,
        completed_by                BIGINT,
        completion_reason           VARCHAR(255),
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for workflow_instances
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity 
      ON workflow_instances (entity_type, entity_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_instances_state 
      ON workflow_instances (current_state)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_instances_status 
      ON workflow_instances (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow 
      ON workflow_instances (workflow_definition_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_instances_organization 
      ON workflow_instances (organization_id)
    `);

    // Workflow Transitions table - Transition history
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_transitions (
        id                          BIGSERIAL PRIMARY KEY,
        workflow_instance_id        BIGINT NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
        from_state                  VARCHAR(128),
        to_state                    VARCHAR(128) NOT NULL,
        transition_name             VARCHAR(128),
        triggered_by                BIGINT,
        trigger_type                VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
        comments                    TEXT,
        transition_data             JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Create indexes for workflow_transitions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_transitions_instance 
      ON workflow_transitions (workflow_instance_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_transitions_created 
      ON workflow_transitions (created_at)
    `);

    // Workflow Approvals table - Approval steps
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_approvals (
        id                          BIGSERIAL PRIMARY KEY,
        workflow_instance_id        BIGINT NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
        approval_step               INTEGER NOT NULL,
        approval_level              INTEGER NOT NULL DEFAULT 1,
        approver_id                 BIGINT NOT NULL,
        delegated_to                BIGINT,
        status                      VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        is_required                 BOOLEAN NOT NULL DEFAULT true,
        is_auto_approved            BOOLEAN NOT NULL DEFAULT false,
        auto_approval_reason        VARCHAR(255),
        comments                    TEXT,
        assigned_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
        due_date                    TIMESTAMPTZ,
        approved_at                 TIMESTAMPTZ,
        rejected_at                 TIMESTAMPTZ,
        escalated_at                TIMESTAMPTZ,
        reminder_sent_at            TIMESTAMPTZ,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Create indexes for workflow_approvals
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_approvals_instance 
      ON workflow_approvals (workflow_instance_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_approvals_approver 
      ON workflow_approvals (approver_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_approvals_status 
      ON workflow_approvals (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_workflow_approvals_step 
      ON workflow_approvals (workflow_instance_id, approval_step, approval_level)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE workflow_definitions IS 'Workflow definitions with JSON-based state machine configurations'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE workflow_instances IS 'Active workflow executions for entity instances'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE workflow_transitions IS 'Workflow transition history for audit trail'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE workflow_approvals IS 'Approval steps in workflow instances with parallel and sequential support'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN workflow_definitions.workflow_definition IS 'JSON object with states, transitions, conditions, and actions'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN workflow_instances.status IS 'ACTIVE, COMPLETED, CANCELLED, SUSPENDED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN workflow_transitions.trigger_type IS 'MANUAL, AUTO, TIMEOUT, SYSTEM'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN workflow_approvals.status IS 'PENDING, APPROVED, REJECTED, DELEGATED, ESCALATED, SKIPPED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS workflow_approvals CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS workflow_transitions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS workflow_instances CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS workflow_definitions CASCADE`);
  }
}


