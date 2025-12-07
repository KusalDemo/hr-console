import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Projects Migration
 * 
 * This migration creates:
 * - projects table (project tracking with budgets, hierarchy, status workflow, phases)
 * - project_phases table (project phases)
 * - project_teams table (team assignments and roles)
 * - Indexes for performance
 * - Foreign key relationships
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Projects0000000000016 implements MigrationInterface {
  name = 'Projects0000000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Projects table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id                          BIGSERIAL PRIMARY KEY,
        project_key                 VARCHAR(128) UNIQUE NOT NULL,
        name                        VARCHAR(255) NOT NULL,
        description                 TEXT,
        organization_id             BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        parent_project_id           BIGINT REFERENCES projects(id) ON DELETE SET NULL,
        status                      VARCHAR(32) NOT NULL DEFAULT 'PLANNING',
        priority                    VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
        health                      VARCHAR(32) NOT NULL DEFAULT 'HEALTHY',
        start_date                  DATE,
        end_date                    DATE,
        actual_completion_date      DATE,
        project_manager_id          BIGINT,
        client_id                   BIGINT,
        budgeted_amount            DECIMAL(15,2) NOT NULL DEFAULT 0,
        actual_cost_amount          DECIMAL(15,2) NOT NULL DEFAULT 0,
        budgeted_hours              DECIMAL(10,2) NOT NULL DEFAULT 0,
        actual_hours                DECIMAL(10,2) NOT NULL DEFAULT 0,
        estimated_hours             DECIMAL(10,2) NOT NULL DEFAULT 0,
        budgeted_revenue            DECIMAL(15,2) NOT NULL DEFAULT 0,
        actual_revenue              DECIMAL(15,2) NOT NULL DEFAULT 0,
        is_template                 BOOLEAN NOT NULL DEFAULT false,
        template_id                 BIGINT REFERENCES projects(id) ON DELETE SET NULL,
        is_archived                 BOOLEAN NOT NULL DEFAULT false,
        archived_at                 TIMESTAMPTZ,
        archived_by                 BIGINT,
        project_metadata            JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for projects
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_key 
      ON projects (project_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_organization 
      ON projects (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_status 
      ON projects (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_parent 
      ON projects (parent_project_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_template 
      ON projects (is_template)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_archived 
      ON projects (is_archived)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_health 
      ON projects (health)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_manager 
      ON projects (project_manager_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_client 
      ON projects (client_id)
    `);

    // Composite index for common queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_org_status_archived 
      ON projects (organization_id, status, is_archived)
    `);

    // Project Phases table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_phases (
        id                          BIGSERIAL PRIMARY KEY,
        project_id                  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name                        VARCHAR(255) NOT NULL,
        description                 TEXT,
        sequence                    INTEGER NOT NULL DEFAULT 1,
        status                      VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED',
        start_date                  DATE,
        end_date                    DATE,
        actual_completion_date      DATE,
        budgeted_amount             DECIMAL(15,2) NOT NULL DEFAULT 0,
        actual_cost_amount          DECIMAL(15,2) NOT NULL DEFAULT 0,
        budgeted_hours              DECIMAL(10,2) NOT NULL DEFAULT 0,
        actual_hours                DECIMAL(10,2) NOT NULL DEFAULT 0,
        phase_metadata              JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for project_phases
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_phases_project 
      ON project_phases (project_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_phases_sequence 
      ON project_phases (project_id, sequence)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_phases_status 
      ON project_phases (status)
    `);

    // Project Teams table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_teams (
        id                          BIGSERIAL PRIMARY KEY,
        project_id                  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        employee_id                 BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        role                        VARCHAR(32) NOT NULL DEFAULT 'CONTRIBUTOR',
        allocation_percentage       DECIMAL(5,2) NOT NULL DEFAULT 100,
        start_date                  DATE,
        end_date                    DATE,
        hourly_rate                 DECIMAL(10,2),
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        assignment_metadata         JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT uq_project_teams_project_employee UNIQUE (project_id, employee_id)
      )
    `);

    // Create indexes for project_teams
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_teams_project 
      ON project_teams (project_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_teams_employee 
      ON project_teams (employee_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_teams_project_employee 
      ON project_teams (project_id, employee_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_teams_active 
      ON project_teams (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_teams_role 
      ON project_teams (role)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE projects IS 'Project tracking with budgets, hierarchy, status workflow, and phases'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE project_phases IS 'Project phases within projects'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE project_teams IS 'Team member assignments to projects with roles'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN projects.status IS 'PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED, ARCHIVED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN projects.priority IS 'LOW, MEDIUM, HIGH, CRITICAL'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN projects.health IS 'HEALTHY, AT_RISK, OVER_BUDGET, BEHIND_SCHEDULE, CRITICAL'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN project_phases.status IS 'NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN project_teams.role IS 'PROJECT_MANAGER, TEAM_LEAD, DEVELOPER, DESIGNER, ANALYST, TESTER, CONSULTANT, CONTRIBUTOR, OBSERVER'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS project_teams CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_phases CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS projects CASCADE`);
  }
}


