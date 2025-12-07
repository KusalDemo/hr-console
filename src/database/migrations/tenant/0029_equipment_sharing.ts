import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Equipment Sharing & Booking Migration
 *
 * This migration creates:
 * - equipment_bookings table (shared equipment booking system with approval workflows)
 * - Adds booking availability fields to equipment table
 * - Indexes for performance optimization
 * - Foreign key relationships
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class EquipmentSharing0000000000029 implements MigrationInterface {
  name = 'EquipmentSharing0000000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add booking fields to equipment table
    await queryRunner.query(`
      ALTER TABLE equipment
      ADD COLUMN IF NOT EXISTS is_bookable BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS booking_availability_rules JSONB,
      ADD COLUMN IF NOT EXISTS max_concurrent_bookings INTEGER
    `);

    // Create equipment_bookings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS equipment_bookings (
        id                          BIGSERIAL PRIMARY KEY,
        equipment_id                BIGINT NOT NULL,
        employee_id                  BIGINT NOT NULL,
        organization_id              BIGINT NOT NULL,
        booking_status               VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        start_date                   TIMESTAMPTZ NOT NULL,
        end_date                     TIMESTAMPTZ NOT NULL,
        actual_pickup_date           TIMESTAMPTZ,
        actual_return_date           TIMESTAMPTZ,
        booking_purpose              TEXT,
        booking_notes                TEXT,
        return_notes                 TEXT,
        condition_at_pickup          VARCHAR(64),
        condition_at_return          VARCHAR(64),
        workflow_instance_id          BIGINT,
        approved_by_id                BIGINT,
        approved_at                   TIMESTAMPTZ,
        rejected_by_id                BIGINT,
        rejected_at                   TIMESTAMPTZ,
        rejection_reason              TEXT,
        cancelled_by_id               BIGINT,
        cancelled_at                  TIMESTAMPTZ,
        cancellation_reason           TEXT,
        usage_hours                   DECIMAL(10,2),
        usage_analytics               JSONB,
        booking_metadata              JSONB,
        created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                    BIGINT,
        updated_by                    BIGINT,
        CONSTRAINT fk_equipment_bookings_equipment 
          FOREIGN KEY (equipment_id) 
          REFERENCES equipment(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_equipment_bookings_employee 
          FOREIGN KEY (employee_id) 
          REFERENCES employees(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_equipment_bookings_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_equipment_bookings_workflow 
          FOREIGN KEY (workflow_instance_id) 
          REFERENCES workflow_instances(id) 
          ON DELETE SET NULL
      )
    `);

    // Create indexes for equipment_bookings
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_bookings_equipment 
      ON equipment_bookings (equipment_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_bookings_employee 
      ON equipment_bookings (employee_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_bookings_status 
      ON equipment_bookings (booking_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_bookings_dates 
      ON equipment_bookings (start_date, end_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_bookings_active 
      ON equipment_bookings (booking_status, start_date, end_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_bookings_workflow 
      ON equipment_bookings (workflow_instance_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_bookings_organization 
      ON equipment_bookings (organization_id)
    `);

    // Composite index for conflict detection queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_bookings_conflict_detection 
      ON equipment_bookings (equipment_id, booking_status, start_date, end_date)
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE equipment_bookings IS 'Shared equipment booking system with approval workflows, conflict detection, usage analytics, and return tracking';
      COMMENT ON COLUMN equipment_bookings.booking_status IS 'PENDING, APPROVED, REJECTED, ACTIVE, COMPLETED, CANCELLED';
      COMMENT ON COLUMN equipment_bookings.booking_availability_rules IS 'JSON: advanceBookingDays, maxBookingDays, minBookingDays, requiresApproval, allowedTimeSlots, blackoutDates, bookingPolicy';
      COMMENT ON COLUMN equipment.is_bookable IS 'Whether equipment is available for booking';
      COMMENT ON COLUMN equipment.booking_availability_rules IS 'JSON: advanceBookingDays, maxBookingDays, minBookingDays, requiresApproval, allowedTimeSlots, blackoutDates, bookingPolicy';
      COMMENT ON COLUMN equipment.max_concurrent_bookings IS 'Maximum concurrent bookings allowed (null = unlimited)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop equipment_bookings table
    await queryRunner.query(`DROP TABLE IF EXISTS equipment_bookings CASCADE`);

    // Remove booking fields from equipment table
    await queryRunner.query(`
      ALTER TABLE equipment
      DROP COLUMN IF EXISTS is_bookable,
      DROP COLUMN IF EXISTS booking_availability_rules,
      DROP COLUMN IF EXISTS max_concurrent_bookings
    `);
  }
}
