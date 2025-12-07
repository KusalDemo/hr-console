import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Resources Migration
 * 
 * This migration creates:
 * - resources table (bookable resources: rooms, equipment, vehicles with capacity, availability, location mapping)
 * - resource_bookings table (resource bookings with conflict detection, approval workflows, usage tracking)
 * - Indexes for performance optimization
 * - Foreign key relationships
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Resources0000000000023 implements MigrationInterface {
  name = 'Resources0000000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Resources table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS resources (
        id                          BIGSERIAL PRIMARY KEY,
        resource_name               VARCHAR(255) NOT NULL,
        resource_description        TEXT,
        resource_type               VARCHAR(32) NOT NULL DEFAULT 'ROOM',
        category                    VARCHAR(128),
        resource_status             VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
        organization_id             BIGINT,
        location_id                 BIGINT,
        location_name               VARCHAR(255),
        capacity                    INTEGER,
        features                    JSONB,
        hourly_rate                 DECIMAL(10,2),
        currency                    VARCHAR(8) DEFAULT 'USD',
        requires_approval           BOOLEAN NOT NULL DEFAULT false,
        max_advance_booking_days    INTEGER,
        min_booking_duration_minutes INTEGER,
        max_booking_duration_minutes INTEGER,
        cancellation_hours          INTEGER,
        maintenance_schedule       JSONB,
        next_maintenance_date       DATE,
        availability_rules          JSONB,
        is_active                  BOOLEAN NOT NULL DEFAULT true,
        resource_metadata          JSONB,
        created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                 BIGINT,
        updated_by                 BIGINT
      )
    `);

    // Create indexes for resources
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resources_type 
      ON resources (resource_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resources_status 
      ON resources (resource_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resources_organization 
      ON resources (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resources_category 
      ON resources (category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resources_location 
      ON resources (location_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resources_active 
      ON resources (is_active)
    `);

    // Composite index for availability queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resources_availability 
      ON resources (resource_type, resource_status, is_active, organization_id)
    `);

    // Resource Bookings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS resource_bookings (
        id                          BIGSERIAL PRIMARY KEY,
        resource_id                 BIGINT NOT NULL,
        booked_by_id                BIGINT NOT NULL,
        organization_id             BIGINT,
        booking_title               VARCHAR(255) NOT NULL,
        booking_description         TEXT,
        start_time                  TIMESTAMPTZ NOT NULL,
        end_time                    TIMESTAMPTZ NOT NULL,
        booking_status              VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        has_conflicts               BOOLEAN NOT NULL DEFAULT false,
        conflict_details            JSONB,
        calendar_event_id           BIGINT,
        approver_id                 BIGINT,
        approval_reason             TEXT,
        approved_at                TIMESTAMPTZ,
        attendee_count              INTEGER,
        special_requirements        TEXT,
        recurrence_pattern          JSONB,
        is_recurring                BOOLEAN NOT NULL DEFAULT false,
        parent_booking_id           BIGINT,
        cancellation_reason         TEXT,
        cancelled_by_id             BIGINT,
        cancelled_at                TIMESTAMPTZ,
        actual_start_time           TIMESTAMPTZ,
        actual_end_time             TIMESTAMPTZ,
        usage_notes                 TEXT,
        booking_metadata            JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_resource_bookings_resource 
          FOREIGN KEY (resource_id) 
          REFERENCES resources(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for resource_bookings
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resource_bookings_resource 
      ON resource_bookings (resource_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resource_bookings_user 
      ON resource_bookings (booked_by_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resource_bookings_status 
      ON resource_bookings (booking_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resource_bookings_start 
      ON resource_bookings (start_time)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resource_bookings_end 
      ON resource_bookings (end_time)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resource_bookings_organization 
      ON resource_bookings (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resource_bookings_calendar_event 
      ON resource_bookings (calendar_event_id)
    `);

    // Composite index for date range queries (critical for conflict detection)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resource_bookings_date_range 
      ON resource_bookings (start_time, end_time)
    `);

    // Composite index for conflict detection queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resource_bookings_conflict_check 
      ON resource_bookings (resource_id, booking_status, start_time, end_time)
    `);

    // Index for recurring bookings
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_resource_bookings_recurring 
      ON resource_bookings (parent_booking_id, is_recurring)
    `);

    // Add comment to tables
    await queryRunner.query(`
      COMMENT ON TABLE resources IS 'Bookable resources (rooms, equipment, vehicles) with capacity, availability, and location mapping';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE resource_bookings IS 'Resource bookings with conflict detection, approval workflows, and usage tracking';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resource_bookings_recurring
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resource_bookings_conflict_check
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resource_bookings_date_range
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resource_bookings_calendar_event
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resource_bookings_organization
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resource_bookings_end
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resource_bookings_start
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resource_bookings_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resource_bookings_user
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resource_bookings_resource
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resources_availability
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resources_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resources_location
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resources_category
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resources_organization
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resources_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_resources_type
    `);

    // Drop tables
    await queryRunner.query(`
      DROP TABLE IF EXISTS resource_bookings CASCADE
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS resources CASCADE
    `);
  }
}
