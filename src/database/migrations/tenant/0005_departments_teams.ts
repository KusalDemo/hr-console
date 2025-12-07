import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Departments and Teams Migration
 *
 * This migration creates:
 * - Departments table with hierarchical structure
 * - Teams table with department relationship
 * - Indexes for performance
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class DepartmentsTeams0000000000005 implements MigrationInterface {
  name = 'DepartmentsTeams0000000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Departments table - Hierarchical department structure within organizations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id                      BIGSERIAL PRIMARY KEY,
        organization_id         BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        department_key          VARCHAR(128) NOT NULL,
        name                    VARCHAR(255) NOT NULL,
        display_name            VARCHAR(255),
        description             TEXT,
        parent_department_id    BIGINT REFERENCES departments(id) ON DELETE SET NULL,
        department_type         VARCHAR(64) NOT NULL DEFAULT 'STANDARD',
        cost_center_code        VARCHAR(64),
        status                  VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        manager_id              BIGINT REFERENCES employees(id) ON DELETE SET NULL,
        headcount_limit         INTEGER,
        budget_allocated        DECIMAL(15,2),
        budget_period           VARCHAR(32),
        location                VARCHAR(255),
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by              BIGINT,
        updated_by              BIGINT,
        UNIQUE(organization_id, department_key)
      )
    `);

    // Create indexes for departments
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_departments_org 
      ON departments (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_departments_key 
      ON departments (organization_id, department_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_departments_parent 
      ON departments (parent_department_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_departments_manager 
      ON departments (manager_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_departments_status 
      ON departments (status)
    `);

    // Teams table - Groups within departments or across departments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id                      BIGSERIAL PRIMARY KEY,
        organization_id         BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        department_id           BIGINT REFERENCES departments(id) ON DELETE SET NULL,
        team_key                VARCHAR(128) NOT NULL,
        name                    VARCHAR(255) NOT NULL,
        display_name            VARCHAR(255),
        description             TEXT,
        status                  VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        team_lead_id            BIGINT REFERENCES employees(id) ON DELETE SET NULL,
        size_limit              INTEGER,
        location                VARCHAR(255),
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by              BIGINT,
        updated_by              BIGINT,
        UNIQUE(organization_id, team_key)
      )
    `);

    // Create indexes for teams
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_teams_org 
      ON teams (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_teams_key 
      ON teams (organization_id, team_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_teams_department 
      ON teams (department_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_teams_lead 
      ON teams (team_lead_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_teams_status 
      ON teams (status)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE departments IS 'Hierarchical department structure within organizations'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE teams IS 'Teams within departments or across departments (cross-departmental)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN departments.department_type IS 'STANDARD, COST_CENTER, PROFIT_CENTER, DIVISION, UNIT'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN departments.status IS 'ACTIVE, INACTIVE, ARCHIVED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN teams.status IS 'ACTIVE, INACTIVE, ARCHIVED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN teams.department_id IS 'Optional: null for cross-departmental teams'
    `);

    // Add foreign key constraint from employees to departments (if employees table exists)
    // This allows employees to reference departments
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'employees') THEN
          -- Check if constraint doesn't already exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_employees_department' 
            AND table_schema = current_schema()
          ) THEN
            ALTER TABLE employees 
            ADD CONSTRAINT fk_employees_department 
            FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
          END IF;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS teams CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS departments CASCADE`);
  }
}
