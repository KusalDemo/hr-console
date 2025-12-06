import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Employees Migration
 * 
 * This migration creates the employees table with:
 * - Basic employee information (name, email, employee number)
 * - Employment details (type, status, hire date, termination)
 * - Organization relationship
 * - Department and manager relationships (references to be created later)
 * - Personal information (address, contact, emergency contact)
 * - Profile metadata (JSONB for flexible data)
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Employees0000000000004 implements MigrationInterface {
  name = 'Employees0000000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Employees table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id                      BIGSERIAL PRIMARY KEY,
        external_id             VARCHAR(128),
        employee_number         VARCHAR(64) UNIQUE,
        first_name              VARCHAR(255) NOT NULL,
        last_name               VARCHAR(255) NOT NULL,
        email                   VARCHAR(255) UNIQUE NOT NULL,
        employee_type           VARCHAR(32) NOT NULL DEFAULT 'FULL_TIME',
        employment_status       VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        hire_date               DATE,
        termination_date        DATE,
        termination_reason      VARCHAR(255),
        cost_center_id          BIGINT,
        department_id           BIGINT,
        manager_id              BIGINT REFERENCES employees(id) ON DELETE SET NULL,
        job_title               VARCHAR(255),
        phone                   VARCHAR(32),
        mobile                  VARCHAR(32),
        address_line1           VARCHAR(255),
        address_line2           VARCHAR(255),
        city                    VARCHAR(128),
        state                   VARCHAR(128),
        postal_code             VARCHAR(32),
        country                 VARCHAR(64),
        date_of_birth           DATE,
        gender                  VARCHAR(32),
        national_id             VARCHAR(128),
        tax_id                  VARCHAR(128),
        emergency_contact_name  VARCHAR(255),
        emergency_contact_phone VARCHAR(32),
        emergency_contact_relation VARCHAR(64),
        profile_metadata        JSONB,
        is_active               BOOLEAN NOT NULL DEFAULT true,
        organization_id         BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by              BIGINT,
        updated_by              BIGINT
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_employee_number 
      ON employees (employee_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_email 
      ON employees (email)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_organization 
      ON employees (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_department 
      ON employees (department_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_manager 
      ON employees (manager_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_status 
      ON employees (employment_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_active 
      ON employees (is_active)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE employees IS 'Employee records within organizations'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN employees.employee_type IS 'FULL_TIME, PART_TIME, CONTRACTOR, INTERN, TEMPORARY, VOLUNTEER'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN employees.employment_status IS 'ACTIVE, INACTIVE, TERMINATED, ON_LEAVE, SUSPENDED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN employees.manager_id IS 'Self-referential: manager is also an employee'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table (cascade will handle foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS employees CASCADE`);
  }
}

