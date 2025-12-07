import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Goals & OKR Migration
 *
 * This migration creates:
 * - goals table (objectives and key results with alignment, progress tracking, check-ins, milestones)
 * - key_results table (key results for OKR goals with progress tracking)
 * - Indexes for performance optimization
 * - Foreign key relationships
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class GoalsOkr0000000000024 implements MigrationInterface {
  name = 'GoalsOkr0000000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Goals table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id                          BIGSERIAL PRIMARY KEY,
        goal_title                  VARCHAR(255) NOT NULL,
        goal_description            TEXT,
        goal_type                   VARCHAR(32) NOT NULL DEFAULT 'INDIVIDUAL',
        status                      VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
        priority                    VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
        organization_id             BIGINT NOT NULL,
        owner_id                    BIGINT NOT NULL,
        department_id              BIGINT,
        team_id                     BIGINT,
        parent_goal_id              BIGINT,
        template_id                 BIGINT,
        is_template                 BOOLEAN NOT NULL DEFAULT false,
        period_start                DATE NOT NULL,
        period_end                  DATE NOT NULL,
        target_completion_date      DATE,
        actual_completion_date      DATE,
        progress_percentage         DECIMAL(5,2) NOT NULL DEFAULT 0,
        last_check_in_date          DATE,
        next_check_in_date          DATE,
        check_in_frequency          VARCHAR(32),
        check_ins_completed         INTEGER NOT NULL DEFAULT 0,
        milestones                  JSONB,
        metrics                     JSONB,
        performance_review_id       BIGINT,
        is_archived                 BOOLEAN NOT NULL DEFAULT false,
        goal_metadata               JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_goals_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for goals
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_goals_organization 
      ON goals (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_goals_owner 
      ON goals (owner_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_goals_type 
      ON goals (goal_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_goals_status 
      ON goals (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_goals_parent 
      ON goals (parent_goal_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_goals_template 
      ON goals (is_template)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_goals_archived 
      ON goals (is_archived)
    `);

    // Composite index for period queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_goals_period 
      ON goals (period_start, period_end)
    `);

    // Self-referencing foreign key for parent goal (goal alignment)
    await queryRunner.query(`
      ALTER TABLE goals 
      ADD CONSTRAINT fk_goals_parent_goal 
      FOREIGN KEY (parent_goal_id) 
      REFERENCES goals(id) 
      ON DELETE SET NULL
    `);

    // Key Results table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS key_results (
        id                          BIGSERIAL PRIMARY KEY,
        goal_id                     BIGINT NOT NULL,
        key_result_title            VARCHAR(255) NOT NULL,
        key_result_description      TEXT,
        key_result_type             VARCHAR(32) NOT NULL DEFAULT 'PERCENTAGE',
        status                      VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED',
        owner_id                    BIGINT NOT NULL,
        target_value                DECIMAL(15,2) NOT NULL,
        current_value               DECIMAL(15,2) NOT NULL DEFAULT 0,
        starting_value               DECIMAL(15,2) NOT NULL DEFAULT 0,
        unit                        VARCHAR(32),
        progress_percentage         DECIMAL(5,2) NOT NULL DEFAULT 0,
        last_updated_date           DATE,
        target_completion_date      DATE,
        actual_completion_date      DATE,
        check_in_history            JSONB,
        key_result_metadata         JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_key_results_goal 
          FOREIGN KEY (goal_id) 
          REFERENCES goals(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for key_results
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_key_results_goal 
      ON key_results (goal_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_key_results_status 
      ON key_results (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_key_results_owner 
      ON key_results (owner_id)
    `);

    // Composite index for goal progress queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_key_results_goal_progress 
      ON key_results (goal_id, status, progress_percentage)
    `);

    // Add comments to tables
    await queryRunner.query(`
      COMMENT ON TABLE goals IS 'Objectives and Key Results (OKR) with alignment, progress tracking, check-ins, and milestones';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE key_results IS 'Key results for OKR goals with progress tracking and check-in history';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN goals.goal_type IS 'ORGANIZATIONAL, DEPARTMENT, TEAM, INDIVIDUAL';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN goals.status IS 'DRAFT, ACTIVE, ON_HOLD, COMPLETED, CANCELLED, ARCHIVED';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN goals.priority IS 'LOW, MEDIUM, HIGH, CRITICAL';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN key_results.key_result_type IS 'PERCENTAGE, NUMERIC, BINARY, CURRENCY, CUSTOM';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN key_results.status IS 'NOT_STARTED, IN_PROGRESS, AT_RISK, COMPLETED, CANCELLED';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_key_results_goal_progress
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_key_results_owner
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_key_results_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_key_results_goal
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_goals_period
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_goals_archived
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_goals_template
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_goals_parent
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_goals_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_goals_type
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_goals_owner
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_goals_organization
    `);

    // Drop tables (key_results first due to foreign key)
    await queryRunner.query(`
      DROP TABLE IF EXISTS key_results CASCADE
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS goals CASCADE
    `);
  }
}
