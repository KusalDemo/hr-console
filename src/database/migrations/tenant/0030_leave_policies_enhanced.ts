import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Advanced Leave Policies Migration
 * 
 * This migration enhances leave policies with:
 * - Employee leave policy assignments table (multiple policies per employee with priorities)
 * - Enhanced indexes for performance
 * - Foreign key relationships
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class LeavePoliciesEnhanced0000000000030 implements MigrationInterface {
  name = 'LeavePoliciesEnhanced0000000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create employee_leave_policy_assignments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employee_leave_policy_assignments (
        id                          BIGSERIAL PRIMARY KEY,
        employee_id                 BIGINT NOT NULL,
        leave_policy_id             BIGINT NOT NULL,
        priority                    INTEGER NOT NULL DEFAULT 1,
        effective_start_date        DATE NOT NULL,
        effective_end_date          DATE,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        assignment_notes            TEXT,
        assignment_metadata         JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_employee_leave_policy_assignments_employee 
          FOREIGN KEY (employee_id) 
          REFERENCES employees(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_employee_leave_policy_assignments_policy 
          FOREIGN KEY (leave_policy_id) 
          REFERENCES leave_policies(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for employee_leave_policy_assignments
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_leave_policy_assignments_employee 
      ON employee_leave_policy_assignments (employee_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_leave_policy_assignments_policy 
      ON employee_leave_policy_assignments (leave_policy_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_leave_policy_assignments_active 
      ON employee_leave_policy_assignments (employee_id, is_active, priority)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_leave_policy_assignments_effective 
      ON employee_leave_policy_assignments (effective_start_date, effective_end_date)
    `);

    // Composite index for active assignments query
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_leave_policy_assignments_active_effective 
      ON employee_leave_policy_assignments (employee_id, is_active, effective_start_date, effective_end_date, priority)
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE employee_leave_policy_assignments IS 'Employee leave policy assignments with priorities for multiple policies per employee support';
      COMMENT ON COLUMN employee_leave_policy_assignments.priority IS 'Priority (lower number = higher priority) used when employee has multiple policies';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop employee_leave_policy_assignments table
    await queryRunner.query(`DROP TABLE IF EXISTS employee_leave_policy_assignments CASCADE`);
  }
}
