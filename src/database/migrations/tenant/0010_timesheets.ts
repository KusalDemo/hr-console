import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Timesheets Migration
 * 
 * This migration creates:
 * - timesheet_periods table (period definitions: weekly, bi-weekly, monthly, custom)
 * - timesheets table (timesheet instances linking employee, period, status, totals)
 * - timesheet_entries table (manual time entries within timesheets)
 * - Indexes for performance
 * - Foreign key relationships
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Timesheets0000000000010 implements MigrationInterface {
  name = 'Timesheets0000000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Timesheet Periods table - Period definitions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS timesheet_periods (
        id                          BIGSERIAL PRIMARY KEY,
        period_key                  VARCHAR(128) UNIQUE NOT NULL,
        period_name                 VARCHAR(255) NOT NULL,
        period_type                 VARCHAR(32) NOT NULL,
        start_date                  DATE NOT NULL,
        days_in_period              INTEGER NOT NULL,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        description                 TEXT,
        organization_id             BIGINT,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Create indexes for timesheet_periods
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheet_periods_key 
      ON timesheet_periods (period_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheet_periods_active 
      ON timesheet_periods (is_active)
    `);

    // Timesheets table - Timesheet instances
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS timesheets (
        id                          BIGSERIAL PRIMARY KEY,
        employee_id                 BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        period_id                   BIGINT NOT NULL REFERENCES timesheet_periods(id) ON DELETE RESTRICT,
        period_start_date           DATE NOT NULL,
        period_end_date             DATE NOT NULL,
        period_number                BIGINT,
        status                      VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
        total_hours                 DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_billable_hours        DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_billing_amount        DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_cost_amount           DECIMAL(10,2) NOT NULL DEFAULT 0,
        organization_id             BIGINT,
        submitted_at                TIMESTAMPTZ,
        submitted_by                BIGINT,
        approved_by                 BIGINT,
        approved_at                 TIMESTAMPTZ,
        rejected_by                 BIGINT,
        rejected_at                 TIMESTAMPTZ,
        rejection_reason            TEXT,
        is_locked                   BOOLEAN NOT NULL DEFAULT false,
        lock_reason                 VARCHAR(255),
        locked_at                   TIMESTAMPTZ,
        locked_by                   BIGINT,
        notes                       TEXT,
        workflow_instance_id         BIGINT,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT uq_timesheets_employee_period UNIQUE (employee_id, period_id, period_start_date)
      )
    `);

    // Create indexes for timesheets
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_employee 
      ON timesheets (employee_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_period 
      ON timesheets (period_id, period_start_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_status 
      ON timesheets (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_employee_period 
      ON timesheets (employee_id, period_id, period_start_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheets_organization 
      ON timesheets (organization_id)
    `);

    // Timesheet Entries table - Manual time entries
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS timesheet_entries (
        id                          BIGSERIAL PRIMARY KEY,
        timesheet_id                BIGINT NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
        entry_date                  DATE NOT NULL,
        hours                       DECIMAL(10,2) NOT NULL,
        billable                    BOOLEAN NOT NULL DEFAULT false,
        project_id                  BIGINT,
        task_id                     BIGINT,
        description                 TEXT,
        billing_rate                DECIMAL(10,2),
        billing_amount              DECIMAL(10,2),
        cost_rate                   DECIMAL(10,2),
        cost_amount                 DECIMAL(10,2),
        entry_metadata              JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for timesheet_entries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheet_entries_timesheet 
      ON timesheet_entries (timesheet_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_timesheet_entries_date 
      ON timesheet_entries (entry_date)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE timesheet_periods IS 'Timesheet period definitions (weekly, bi-weekly, monthly, custom)'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE timesheets IS 'Timesheet instances linking employees, periods, status, and totals'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE timesheet_entries IS 'Manual time entries within timesheets'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN timesheet_periods.period_type IS 'WEEKLY, BI_WEEKLY, SEMI_MONTHLY, MONTHLY, CUSTOM'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN timesheets.status IS 'DRAFT, SUBMITTED, APPROVED, REJECTED, LOCKED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN timesheets.workflow_instance_id IS 'Reference to workflow instance for approval workflow'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS timesheet_entries CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS timesheets CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS timesheet_periods CASCADE`);
  }
}


