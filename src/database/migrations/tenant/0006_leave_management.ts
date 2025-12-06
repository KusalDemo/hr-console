import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Leave Management Migration
 * 
 * This migration creates:
 * - Leave policies table (foundation for leave policy management)
 * - Leave requests table (foundation for leave request tracking)
 * - Indexes for performance
 * - Foreign key relationships
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 * 
 * Future migrations will add:
 * - Leave types table (linked to policies)
 * - Leave balances table (tracking accrued/used/available leave)
 * - Leave approval workflow tables
 */
export class LeaveManagement0000000000006 implements MigrationInterface {
  name = 'LeaveManagement0000000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Leave Policies table - Defines leave policies for the tenant
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leave_policies (
        id                          BIGSERIAL PRIMARY KEY,
        policy_key                  VARCHAR(128) UNIQUE,
        policy_name                 VARCHAR(255) NOT NULL,
        description                 TEXT,
        effective_start_date        DATE NOT NULL,
        effective_end_date          DATE,
        is_active                   BOOLEAN NOT NULL DEFAULT false,
        is_template                 BOOLEAN NOT NULL DEFAULT false,
        template_category           VARCHAR(128),
        parent_policy_id            BIGINT REFERENCES leave_policies(id) ON DELETE SET NULL,
        probationary_period_days    INTEGER,
        waiting_period_days         INTEGER,
        waiting_period_type         VARCHAR(32) DEFAULT 'AFTER_HIRE',
        accrual_method              VARCHAR(32) DEFAULT 'PRO_RATED',
        accrual_frequency           VARCHAR(32) DEFAULT 'MONTHLY',
        accrual_custom_formula      TEXT,
        accrual_start_date          DATE,
        accrual_calculation_basis   VARCHAR(32) DEFAULT 'CALENDAR_YEAR',
        allow_carry_over            BOOLEAN NOT NULL DEFAULT false,
        carry_over_percentage       DECIMAL(5,2),
        carry_over_max_days         INTEGER,
        carry_over_expiry_days      INTEGER,
        carry_over_expiry_date      DATE,
        allow_negative_balance      BOOLEAN NOT NULL DEFAULT false,
        max_negative_balance_days   INTEGER,
        prorate_on_hire             BOOLEAN NOT NULL DEFAULT true,
        prorate_on_termination      BOOLEAN NOT NULL DEFAULT true,
        proration_method            VARCHAR(32) DEFAULT 'BY_DAYS',
        policy_metadata             JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for leave_policies
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_policies_active 
      ON leave_policies (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_policies_template 
      ON leave_policies (is_template)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_policies_effective 
      ON leave_policies (effective_start_date, effective_end_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_policies_key 
      ON leave_policies (policy_key)
    `);

    // Leave Requests table - Employee leave requests
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id                  BIGSERIAL PRIMARY KEY,
        employee_id         BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        organization_id     BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        start_date          DATE NOT NULL,
        end_date            DATE NOT NULL,
        number_of_days      DECIMAL(5,2),
        leave_type_id       BIGINT,
        type                VARCHAR(64),
        status              VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        reason              TEXT,
        notes               TEXT,
        approved_by         BIGINT,
        approved_at          TIMESTAMPTZ,
        rejection_reason     TEXT,
        request_metadata     JSONB,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by          BIGINT,
        updated_by          BIGINT,
        CHECK (end_date >= start_date)
      )
    `);

    // Create indexes for leave_requests
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_requests_employee 
      ON leave_requests (employee_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_requests_status 
      ON leave_requests (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_requests_dates 
      ON leave_requests (start_date, end_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_requests_organization 
      ON leave_requests (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_requests_created 
      ON leave_requests (created_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_dates 
      ON leave_requests (employee_id, start_date, end_date)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE leave_policies IS 'Leave policies defining accrual rules, carry-over, and proration for the tenant'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE leave_requests IS 'Employee leave requests with approval workflow'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN leave_policies.accrual_method IS 'FRONT_LOADED, PRO_RATED, CUSTOM_FORMULA'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN leave_policies.accrual_frequency IS 'DAILY, WEEKLY, MONTHLY, YEARLY'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN leave_policies.accrual_calculation_basis IS 'CALENDAR_YEAR, HIRE_ANNIVERSARY, FISCAL_YEAR'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN leave_policies.waiting_period_type IS 'AFTER_HIRE, AFTER_ACCOUNT_ACTIVATION'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN leave_policies.proration_method IS 'BY_DAYS, BY_MONTHS, BY_WORKING_DAYS'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN leave_requests.status IS 'PENDING, APPROVED, REJECTED, CANCELLED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN leave_requests.leave_type_id IS 'Future: Reference to leave_types table (to be created)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN leave_requests.type IS 'Legacy/fallback field for leave type name'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS leave_requests CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS leave_policies CASCADE`);
  }
}

