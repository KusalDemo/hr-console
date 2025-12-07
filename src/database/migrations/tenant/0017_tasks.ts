import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tasks Migration
 *
 * This migration creates:
 * - tasks table (hierarchical task management with dependencies, assignments)
 * - task_dependencies table (task dependencies with types FS, SS, FF, SF)
 * - task_assignees table (many-to-many for additional assignees)
 * - Indexes for performance
 * - Foreign key relationships
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Tasks0000000000017 implements MigrationInterface {
  name = 'Tasks0000000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tasks table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id                          BIGSERIAL PRIMARY KEY,
        task_key                    VARCHAR(128) UNIQUE NOT NULL,
        title                       VARCHAR(255) NOT NULL,
        description                 TEXT,
        project_id                  BIGINT REFERENCES projects(id) ON DELETE CASCADE,
        parent_task_id              BIGINT REFERENCES tasks(id) ON DELETE CASCADE,
        task_type                   VARCHAR(32) NOT NULL DEFAULT 'TASK',
        status                      VARCHAR(32) NOT NULL DEFAULT 'TODO',
        priority                    VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
        assignee_id                 BIGINT REFERENCES employees(id) ON DELETE SET NULL,
        reporter_id                 BIGINT REFERENCES employees(id) ON DELETE SET NULL,
        due_date                    TIMESTAMPTZ,
        start_date                  TIMESTAMPTZ,
        actual_start_date           TIMESTAMPTZ,
        completion_date             TIMESTAMPTZ,
        estimated_hours             DECIMAL(10,2) NOT NULL DEFAULT 0,
        actual_hours                DECIMAL(10,2) NOT NULL DEFAULT 0,
        remaining_hours             DECIMAL(10,2) NOT NULL DEFAULT 0,
        story_points                INTEGER,
        is_template                 BOOLEAN NOT NULL DEFAULT false,
        template_id                 BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
        is_recurring                BOOLEAN NOT NULL DEFAULT false,
        recurrence_pattern          VARCHAR(32) NOT NULL DEFAULT 'NONE',
        recurrence_interval         INTEGER,
        recurrence_end_date         TIMESTAMPTZ,
        next_occurrence_date        TIMESTAMPTZ,
        tags                        TEXT,
        task_metadata               JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for tasks
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_project 
      ON tasks (project_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_parent 
      ON tasks (parent_task_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status 
      ON tasks (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_priority 
      ON tasks (priority)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_type 
      ON tasks (task_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_assignee 
      ON tasks (assignee_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date 
      ON tasks (due_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_template 
      ON tasks (is_template)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_recurring 
      ON tasks (is_recurring)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_key 
      ON tasks (task_key)
    `);

    // Composite indexes for common queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_project_status 
      ON tasks (project_id, status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status 
      ON tasks (assignee_id, status)
    `);

    // Task Dependencies table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id                          BIGSERIAL PRIMARY KEY,
        dependent_task_id           BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        depends_on_task_id           BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        dependency_type             VARCHAR(8) NOT NULL DEFAULT 'FS',
        lag_hours                   DECIMAL(10,2) NOT NULL DEFAULT 0,
        is_hard_dependency           BOOLEAN NOT NULL DEFAULT true,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        CONSTRAINT uq_task_dependencies_tasks UNIQUE (dependent_task_id, depends_on_task_id),
        CONSTRAINT chk_task_dependencies_no_self CHECK (dependent_task_id != depends_on_task_id)
      )
    `);

    // Create indexes for task_dependencies
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_task_dependencies_dependent 
      ON task_dependencies (dependent_task_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on 
      ON task_dependencies (depends_on_task_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_task_dependencies_type 
      ON task_dependencies (dependency_type)
    `);

    // Task Assignees table (many-to-many for additional assignees)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_assignees (
        task_id                     BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        employee_id                 BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (task_id, employee_id)
      )
    `);

    // Create indexes for task_assignees
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_task_assignees_task 
      ON task_assignees (task_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_task_assignees_employee 
      ON task_assignees (employee_id)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE tasks IS 'Hierarchical task management with dependencies, assignments, and time tracking'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE task_dependencies IS 'Task dependencies with types: FS (Finish-to-Start), SS (Start-to-Start), FF (Finish-to-Finish), SF (Start-to-Finish)'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE task_assignees IS 'Many-to-many relationship for additional task assignees'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN tasks.status IS 'TODO, IN_PROGRESS, IN_REVIEW, BLOCKED, COMPLETED, CANCELLED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN tasks.priority IS 'LOW, MEDIUM, HIGH, CRITICAL'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN tasks.task_type IS 'TASK, SUBTASK, BUG, FEATURE, EPIC, STORY'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN tasks.recurrence_pattern IS 'NONE, DAILY, WEEKLY, MONTHLY, YEARLY, CUSTOM'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN task_dependencies.dependency_type IS 'FS (Finish-to-Start), SS (Start-to-Start), FF (Finish-to-Finish), SF (Start-to-Finish)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS task_assignees CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_dependencies CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS tasks CASCADE`);
  }
}

