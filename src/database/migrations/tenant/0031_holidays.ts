import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Holiday Calendar Management Migration
 *
 * This migration creates:
 * - holiday_calendars table (country/region-specific holiday calendars)
 * - holidays table (individual holidays with dates, types, recurrence, observance rules)
 * - employee_holiday_calendar_assignments table (calendar assignment to employees)
 * - Indexes for performance optimization
 * - Foreign key relationships
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Holidays0000000000031 implements MigrationInterface {
  name = 'Holidays0000000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Holiday Calendars table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS holiday_calendars (
        id                          BIGSERIAL PRIMARY KEY,
        calendar_key                VARCHAR(128) UNIQUE NOT NULL,
        name                        VARCHAR(255) NOT NULL,
        description                 VARCHAR(512),
        country_code                VARCHAR(8),
        country_name                VARCHAR(128),
        region_code                 VARCHAR(32),
        region_name                 VARCHAR(128),
        timezone                    VARCHAR(64),
        calendar_type               VARCHAR(32) NOT NULL DEFAULT 'COUNTRY',
        organization_id             BIGINT,
        is_company_specific         BOOLEAN NOT NULL DEFAULT false,
        is_default                  BOOLEAN NOT NULL DEFAULT false,
        supports_floating_holidays  BOOLEAN NOT NULL DEFAULT false,
        observance_rules            JSONB,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_archived                 BOOLEAN NOT NULL DEFAULT false,
        calendar_metadata           JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_holiday_calendars_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE SET NULL
      )
    `);

    // Holidays table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id                          BIGSERIAL PRIMARY KEY,
        holiday_calendar_id          BIGINT NOT NULL,
        name                        VARCHAR(255) NOT NULL,
        description                 VARCHAR(512),
        holiday_date                DATE NOT NULL,
        observed_date                DATE,
        holiday_type                VARCHAR(32) NOT NULL DEFAULT 'PUBLIC',
        is_recurring                BOOLEAN NOT NULL DEFAULT false,
        recurrence_pattern          VARCHAR(64),
        recurrence_month            INTEGER,
        recurrence_day              INTEGER,
        recurrence_weekday           VARCHAR(16),
        recurrence_week             INTEGER,
        is_floating                 BOOLEAN NOT NULL DEFAULT false,
        floating_allocation_days    INTEGER,
        observance_rule             VARCHAR(32),
        is_observed                 BOOLEAN NOT NULL DEFAULT true,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        holiday_metadata            JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_holidays_calendar 
          FOREIGN KEY (holiday_calendar_id) 
          REFERENCES holiday_calendars(id) 
          ON DELETE CASCADE
      )
    `);

    // Employee Holiday Calendar Assignments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS employee_holiday_calendar_assignments (
        id                          BIGSERIAL PRIMARY KEY,
        employee_id                 BIGINT NOT NULL,
        holiday_calendar_id         BIGINT NOT NULL,
        effective_start_date        DATE NOT NULL,
        effective_end_date          DATE,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        assignment_notes            TEXT,
        assignment_metadata         JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_employee_holiday_calendar_assignments_employee 
          FOREIGN KEY (employee_id) 
          REFERENCES employees(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_employee_holiday_calendar_assignments_calendar 
          FOREIGN KEY (holiday_calendar_id) 
          REFERENCES holiday_calendars(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for holiday_calendars
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_holiday_calendars_key 
      ON holiday_calendars (calendar_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_holiday_calendars_country 
      ON holiday_calendars (country_code)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_holiday_calendars_region 
      ON holiday_calendars (region_code)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_holiday_calendars_active 
      ON holiday_calendars (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_holiday_calendars_organization 
      ON holiday_calendars (organization_id)
    `);

    // Create indexes for holidays
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_holidays_calendar 
      ON holidays (holiday_calendar_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_holidays_date 
      ON holidays (holiday_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_holidays_observed_date 
      ON holidays (observed_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_holidays_type 
      ON holidays (holiday_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_holidays_recurring 
      ON holidays (is_recurring)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_holidays_active 
      ON holidays (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_holidays_floating 
      ON holidays (is_floating)
    `);

    // Composite index for date range queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_holidays_date_range 
      ON holidays (holiday_calendar_id, holiday_date, observed_date, is_active)
    `);

    // Create indexes for employee_holiday_calendar_assignments
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_holiday_calendar_assignments_employee 
      ON employee_holiday_calendar_assignments (employee_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_holiday_calendar_assignments_calendar 
      ON employee_holiday_calendar_assignments (holiday_calendar_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_holiday_calendar_assignments_active 
      ON employee_holiday_calendar_assignments (employee_id, is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_holiday_calendar_assignments_effective 
      ON employee_holiday_calendar_assignments (effective_start_date, effective_end_date)
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE holiday_calendars IS 'Country/region-specific holiday calendars with calendar assignment to employees/organizations, floating holidays, and company-specific holidays';
      COMMENT ON TABLE holidays IS 'Individual holidays with dates, types, recurrence, and observance rules. Supports fixed dates, recurring holidays, floating holidays, and observance adjustments';
      COMMENT ON TABLE employee_holiday_calendar_assignments IS 'Calendar assignment to employees with effective date ranges';
      COMMENT ON COLUMN holiday_calendars.calendar_type IS 'COUNTRY, REGION, COMPANY, CUSTOM';
      COMMENT ON COLUMN holidays.holiday_type IS 'PUBLIC, FEDERAL, RELIGIOUS, REGIONAL, COMPANY, FLOATING';
      COMMENT ON COLUMN holidays.recurrence_pattern IS 'Pattern for recurring holidays (e.g., "ANNUAL", "FIRST_MONDAY", "LAST_FRIDAY")';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS employee_holiday_calendar_assignments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS holidays CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS holiday_calendars CASCADE`);
  }
}
