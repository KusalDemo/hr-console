import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Calendars Migration
 * 
 * This migration creates:
 * - calendars table (multi-calendar support for users, teams, organizations)
 * - calendar_events table (calendar events with attendees, recurrence, reminders, timezone support)
 * - calendar_event_attendees table (multiple attendees for events)
 * - recurrence_rules table (recurrence rules for recurring events)
 * - Full-text search indexes
 * - Foreign key relationships
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Calendars0000000000022 implements MigrationInterface {
  name = 'Calendars0000000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Calendars table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS calendars (
        id                          BIGSERIAL PRIMARY KEY,
        calendar_name               VARCHAR(255) NOT NULL,
        calendar_description        TEXT,
        calendar_type               VARCHAR(32) NOT NULL DEFAULT 'USER',
        calendar_visibility         VARCHAR(32) NOT NULL DEFAULT 'PRIVATE',
        owner_id                    BIGINT NOT NULL,
        organization_id             BIGINT,
        team_id                     BIGINT,
        default_timezone            VARCHAR(64) DEFAULT 'UTC',
        calendar_color              VARCHAR(7),
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_default                  BOOLEAN NOT NULL DEFAULT false,
        calendar_metadata            JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for calendars
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calendars_owner 
      ON calendars (owner_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calendars_type 
      ON calendars (calendar_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calendars_organization 
      ON calendars (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calendars_active 
      ON calendars (is_active)
    `);

    // Recurrence Rules table (created before calendar_events due to foreign key)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS recurrence_rules (
        id                          BIGSERIAL PRIMARY KEY,
        frequency                   VARCHAR(32) NOT NULL DEFAULT 'DAILY',
        interval                    INTEGER NOT NULL DEFAULT 1,
        count                       INTEGER,
        until_date                  DATE,
        by_day                      TEXT,
        by_month_day                TEXT,
        by_month                    TEXT,
        by_week_number              TEXT,
        by_year_day                 TEXT,
        week_start                  VARCHAR(2) DEFAULT 'MO',
        recurrence_metadata         JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_recurrence_rules_frequency 
      ON recurrence_rules (frequency)
    `);

    // Calendar Events table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id                          BIGSERIAL PRIMARY KEY,
        calendar_id                 BIGINT NOT NULL,
        event_title                 VARCHAR(255) NOT NULL,
        event_description           TEXT,
        location                    VARCHAR(255),
        start_time                  TIMESTAMPTZ NOT NULL,
        end_time                    TIMESTAMPTZ NOT NULL,
        is_all_day                  BOOLEAN NOT NULL DEFAULT false,
        timezone                    VARCHAR(64),
        event_type                  VARCHAR(32) NOT NULL DEFAULT 'OTHER',
        event_status                VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED',
        organizer_id                BIGINT NOT NULL,
        is_recurring                BOOLEAN NOT NULL DEFAULT false,
        recurrence_rule_id          BIGINT,
        parent_event_id             BIGINT,
        reminder_minutes            TEXT,
        reminders_sent               BOOLEAN NOT NULL DEFAULT false,
        event_url                   TEXT,
        meeting_notes               TEXT,
        event_metadata               JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for calendar_events
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar 
      ON calendar_events (calendar_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calendar_events_start 
      ON calendar_events (start_time)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calendar_events_end 
      ON calendar_events (end_time)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calendar_events_status 
      ON calendar_events (event_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calendar_events_type 
      ON calendar_events (event_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calendar_events_organizer 
      ON calendar_events (organizer_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calendar_events_recurring 
      ON calendar_events (is_recurring, parent_event_id)
    `);

    // Composite index for date range queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calendar_events_date_range 
      ON calendar_events (start_time, end_time)
    `);

    // Foreign keys for calendar_events
    await queryRunner.query(`
      ALTER TABLE calendar_events 
      ADD CONSTRAINT fk_calendar_events_calendar 
      FOREIGN KEY (calendar_id) 
      REFERENCES calendars(id) 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE calendar_events 
      ADD CONSTRAINT fk_calendar_events_recurrence_rule 
      FOREIGN KEY (recurrence_rule_id) 
      REFERENCES recurrence_rules(id) 
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE calendar_events 
      ADD CONSTRAINT fk_calendar_events_parent 
      FOREIGN KEY (parent_event_id) 
      REFERENCES calendar_events(id) 
      ON DELETE CASCADE
    `);

    // Calendar Event Attendees table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS calendar_event_attendees (
        id                          BIGSERIAL PRIMARY KEY,
        event_id                    BIGINT NOT NULL,
        user_id                     BIGINT,
        email                       VARCHAR(255),
        display_name                VARCHAR(255),
        attendee_role               VARCHAR(32) NOT NULL DEFAULT 'OPTIONAL',
        attendee_status             VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        response_date               TIMESTAMPTZ,
        is_required                 BOOLEAN NOT NULL DEFAULT false,
        attendee_metadata           JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT uq_event_attendee UNIQUE (event_id, user_id, email)
      )
    `);

    // Create indexes for calendar_event_attendees
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_event_attendees_event 
      ON calendar_event_attendees (event_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_event_attendees_user 
      ON calendar_event_attendees (user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_event_attendees_status 
      ON calendar_event_attendees (attendee_status)
    `);

    // Foreign key for calendar_event_attendees
    await queryRunner.query(`
      ALTER TABLE calendar_event_attendees 
      ADD CONSTRAINT fk_event_attendees_event 
      FOREIGN KEY (event_id) 
      REFERENCES calendar_events(id) 
      ON DELETE CASCADE
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE calendars IS 'Multi-calendar support for users, teams, organizations with visibility rules'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE calendar_events IS 'Calendar events with attendees, recurrence, reminders, and timezone support'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE calendar_event_attendees IS 'Multiple attendees for calendar events with response tracking'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE recurrence_rules IS 'Recurrence rules for recurring calendar events with complex patterns'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN calendars.calendar_type IS 'USER, TEAM, ORGANIZATION, RESOURCE, PROJECT'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN calendars.calendar_visibility IS 'PRIVATE, INTERNAL, PUBLIC, SHARED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN calendar_events.event_type IS 'MEETING, APPOINTMENT, TASK, HOLIDAY, ALL_DAY, OTHER'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN calendar_events.event_status IS 'TENTATIVE, CONFIRMED, CANCELLED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN calendar_event_attendees.attendee_status IS 'PENDING, ACCEPTED, DECLINED, TENTATIVE, NO_RESPONSE'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN calendar_event_attendees.attendee_role IS 'ORGANIZER, REQUIRED, OPTIONAL'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN recurrence_rules.frequency IS 'DAILY, WEEKLY, MONTHLY, YEARLY'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS calendar_event_attendees CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS calendar_events CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS recurrence_rules CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS calendars CASCADE`);
  }
}

