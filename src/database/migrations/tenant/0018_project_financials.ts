import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Project Financials Migration
 * 
 * This migration creates:
 * - project_budgets table (budget lines with categories, cost tracking)
 * - project_costs table (actual costs: labor, materials, expenses)
 * - Indexes for performance
 * - Foreign key relationships
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class ProjectFinancials0000000000018 implements MigrationInterface {
  name = 'ProjectFinancials0000000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Project Budgets table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_budgets (
        id                          BIGSERIAL PRIMARY KEY,
        project_id                  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        version                     INTEGER NOT NULL DEFAULT 1,
        name                        VARCHAR(255) NOT NULL,
        category                    VARCHAR(32) NOT NULL DEFAULT 'OTHER',
        budgeted_amount             DECIMAL(15,2) NOT NULL DEFAULT 0,
        actual_cost_amount          DECIMAL(15,2) NOT NULL DEFAULT 0,
        committed_amount            DECIMAL(15,2) NOT NULL DEFAULT 0,
        status                      VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
        period_start_date           DATE,
        period_end_date             DATE,
        notes                       TEXT,
        budget_metadata             JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for project_budgets
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_budgets_project 
      ON project_budgets (project_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_budgets_category 
      ON project_budgets (category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_budgets_status 
      ON project_budgets (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_budgets_version 
      ON project_budgets (project_id, version)
    `);

    // Project Costs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_costs (
        id                          BIGSERIAL PRIMARY KEY,
        project_id                  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        budget_line_id              BIGINT REFERENCES project_budgets(id) ON DELETE SET NULL,
        cost_type                   VARCHAR(32) NOT NULL DEFAULT 'OTHER',
        description                 VARCHAR(255) NOT NULL,
        cost_amount                 DECIMAL(15,2) NOT NULL DEFAULT 0,
        cost_date                   DATE NOT NULL,
        quantity                    DECIMAL(10,2),
        unit_price                  DECIMAL(15,2),
        employee_id                 BIGINT REFERENCES employees(id) ON DELETE SET NULL,
        hours                       DECIMAL(10,2),
        hourly_rate                 DECIMAL(10,2),
        task_id                     BIGINT REFERENCES tasks(id) ON DELETE SET NULL,
        time_entry_id               BIGINT,
        vendor                      VARCHAR(255),
        invoice_number              VARCHAR(128),
        receipt_reference           VARCHAR(255),
        status                      VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        is_billable                 BOOLEAN NOT NULL DEFAULT false,
        billing_rate                DECIMAL(15,2),
        billing_amount              DECIMAL(15,2),
        currency                    VARCHAR(3) DEFAULT 'USD',
        cost_metadata               JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for project_costs
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_costs_project 
      ON project_costs (project_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_costs_type 
      ON project_costs (cost_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_costs_status 
      ON project_costs (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_costs_date 
      ON project_costs (cost_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_costs_employee 
      ON project_costs (employee_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_costs_task 
      ON project_costs (task_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_costs_budget 
      ON project_costs (budget_line_id)
    `);

    // Composite indexes for common queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_costs_project_type 
      ON project_costs (project_id, cost_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_costs_project_date 
      ON project_costs (project_id, cost_date)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE project_budgets IS 'Budget lines for projects with categories and cost tracking'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE project_costs IS 'Actual costs incurred for projects (labor, materials, expenses)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN project_budgets.category IS 'LABOR, MATERIALS, EQUIPMENT, TRAVEL, OVERHEAD, SUBCONTRACTOR, SOFTWARE, TRAINING, OTHER'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN project_budgets.status IS 'DRAFT, APPROVED, REVISED, LOCKED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN project_costs.cost_type IS 'LABOR, MATERIALS, EQUIPMENT, TRAVEL, OVERHEAD, SUBCONTRACTOR, SOFTWARE, TRAINING, EXPENSE, OTHER'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN project_costs.status IS 'PENDING, APPROVED, INVOICED, PAID, REJECTED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN project_costs.time_entry_id IS 'Reference to time entry if cost comes from time tracking'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS project_costs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_budgets CASCADE`);
  }
}

