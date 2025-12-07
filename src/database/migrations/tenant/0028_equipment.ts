import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Equipment & Asset Tracking Migration
 * 
 * This migration creates:
 * - equipment table (lifecycle asset management with asset tags, categories, locations, maintenance schedules)
 * - equipment_assignments table (employee assignments with tracking)
 * - equipment_maintenance table (maintenance history with scheduling and tracking)
 * - Indexes for performance optimization
 * - Foreign key relationships
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Equipment0000000000028 implements MigrationInterface {
  name = 'Equipment0000000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Equipment table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS equipment (
        id                          BIGSERIAL PRIMARY KEY,
        asset_tag                   VARCHAR(128) UNIQUE NOT NULL,
        equipment_name              VARCHAR(255) NOT NULL,
        equipment_description       TEXT,
        category                    VARCHAR(128),
        equipment_type              VARCHAR(64),
        equipment_status            VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
        organization_id              BIGINT NOT NULL,
        location_id                 BIGINT,
        location_name               VARCHAR(255),
        parent_equipment_id          BIGINT,
        serial_number               VARCHAR(128),
        model_number                VARCHAR(128),
        manufacturer                VARCHAR(128),
        purchase_date               DATE,
        purchase_cost               DECIMAL(15,2),
        current_value               DECIMAL(15,2),
        depreciation_method         VARCHAR(64),
        useful_life_years           INTEGER,
        warranty_start_date         DATE,
        warranty_end_date           DATE,
        warranty_provider            VARCHAR(255),
        warranty_details            TEXT,
        maintenance_schedule        JSONB,
        next_maintenance_date       DATE,
        last_maintenance_date       DATE,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        equipment_metadata          JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_equipment_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for equipment
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_asset_tag 
      ON equipment (asset_tag)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_category 
      ON equipment (category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_status 
      ON equipment (equipment_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_organization 
      ON equipment (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_location 
      ON equipment (location_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_parent 
      ON equipment (parent_equipment_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_active 
      ON equipment (is_active)
    `);

    // Composite index for maintenance queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_maintenance 
      ON equipment (is_active, equipment_status, next_maintenance_date)
    `);

    // Self-referencing foreign key for parent equipment
    await queryRunner.query(`
      ALTER TABLE equipment 
      ADD CONSTRAINT fk_equipment_parent 
      FOREIGN KEY (parent_equipment_id) 
      REFERENCES equipment(id) 
      ON DELETE SET NULL
    `);

    // Equipment Assignments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS equipment_assignments (
        id                          BIGSERIAL PRIMARY KEY,
        equipment_id                BIGINT NOT NULL,
        employee_id                 BIGINT NOT NULL,
        assignment_status           VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        assigned_date               DATE NOT NULL,
        expected_return_date        DATE,
        actual_return_date          DATE,
        assigned_by_id              BIGINT,
        returned_by_id              BIGINT,
        assignment_notes            TEXT,
        return_notes                TEXT,
        condition_at_assignment     VARCHAR(64),
        condition_at_return         VARCHAR(64),
        assignment_metadata         JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_equipment_assignments_equipment 
          FOREIGN KEY (equipment_id) 
          REFERENCES equipment(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_equipment_assignments_employee 
          FOREIGN KEY (employee_id) 
          REFERENCES employees(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for equipment_assignments
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_assignments_equipment 
      ON equipment_assignments (equipment_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_assignments_employee 
      ON equipment_assignments (employee_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_assignments_status 
      ON equipment_assignments (assignment_status)
    `);

    // Composite index for active assignment queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_assignments_active 
      ON equipment_assignments (assignment_status, assigned_date)
    `);

    // Equipment Maintenance table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS equipment_maintenance (
        id                          BIGSERIAL PRIMARY KEY,
        equipment_id                BIGINT NOT NULL,
        maintenance_type            VARCHAR(32) NOT NULL DEFAULT 'PREVENTIVE',
        maintenance_status          VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
        maintenance_title           VARCHAR(255) NOT NULL,
        maintenance_description     TEXT,
        scheduled_date              DATE NOT NULL,
        completed_date              DATE,
        technician_id               BIGINT,
        vendor                      VARCHAR(255),
        maintenance_cost            DECIMAL(15,2),
        parts_replaced              JSONB,
        maintenance_notes           TEXT,
        next_maintenance_date       DATE,
        maintenance_metadata        JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_equipment_maintenance_equipment 
          FOREIGN KEY (equipment_id) 
          REFERENCES equipment(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_equipment_maintenance_technician 
          FOREIGN KEY (technician_id) 
          REFERENCES employees(id) 
          ON DELETE SET NULL
      )
    `);

    // Create indexes for equipment_maintenance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_equipment 
      ON equipment_maintenance (equipment_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_status 
      ON equipment_maintenance (maintenance_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_type 
      ON equipment_maintenance (maintenance_type)
    `);

    // Composite index for scheduled maintenance queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_date 
      ON equipment_maintenance (scheduled_date, completed_date)
    `);

    // Add comments to tables
    await queryRunner.query(`
      COMMENT ON TABLE equipment IS 'Lifecycle asset management with asset tags, categories, locations, maintenance schedules';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE equipment_assignments IS 'Employee equipment assignments with tracking';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE equipment_maintenance IS 'Maintenance history for equipment with scheduling and tracking';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN equipment.equipment_status IS 'AVAILABLE, ASSIGNED, MAINTENANCE, RETIRED, LOST, DAMAGED';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN equipment_assignments.assignment_status IS 'ACTIVE, RETURNED, LOST, DAMAGED';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN equipment_maintenance.maintenance_type IS 'PREVENTIVE, CORRECTIVE, EMERGENCY, INSPECTION, UPGRADE';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN equipment_maintenance.maintenance_status IS 'SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, DEFERRED';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipment_maintenance_date
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipment_maintenance_type
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipment_maintenance_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipment_maintenance_equipment
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipment_assignments_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipment_assignments_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipment_assignments_employee
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipment_assignments_equipment
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipment_maintenance
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipment_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipment_parent
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipment_location
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipment_organization
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipment_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipment_category
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_equipment_asset_tag
    `);

    // Drop tables (maintenance and assignments first due to foreign keys)
    await queryRunner.query(`
      DROP TABLE IF EXISTS equipment_maintenance CASCADE
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS equipment_assignments CASCADE
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS equipment CASCADE
    `);
  }
}
