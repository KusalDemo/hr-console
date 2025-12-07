import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Notification System Migration
 * 
 * This migration creates:
 * - notification_templates table (email, SMS, push, in-app, webhook templates)
 * - notification_preferences table (user/tenant notification preferences)
 * - notifications table (notification history and delivery tracking)
 * - Indexes for performance optimization
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Notifications0000000000041 implements MigrationInterface {
  name = 'Notifications0000000000041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Notification Templates table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_templates (
        id                          BIGSERIAL PRIMARY KEY,
        template_key                VARCHAR(128) UNIQUE NOT NULL,
        template_name               VARCHAR(255) NOT NULL,
        description                 TEXT,
        channel                     VARCHAR(32) NOT NULL,
        category                    VARCHAR(64),
        email_subject               VARCHAR(255),
        email_body                  TEXT,
        sms_body                    VARCHAR(500),
        push_title                  VARCHAR(255),
        push_body                   TEXT,
        in_app_title                VARCHAR(255),
        in_app_body                 TEXT,
        webhook_payload             JSONB,
        template_variables          JSONB,
        default_priority            VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_system                   BOOLEAN NOT NULL DEFAULT false,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for notification_templates
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_templates_key 
      ON notification_templates (template_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_templates_channel 
      ON notification_templates (channel)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_templates_active 
      ON notification_templates (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_templates_category 
      ON notification_templates (category)
    `);

    // Notification Preferences table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id                          BIGSERIAL PRIMARY KEY,
        user_id                     BIGINT,
        organization_id             BIGINT,
        template_key                VARCHAR(128),
        category                    VARCHAR(64),
        email_enabled               BOOLEAN NOT NULL DEFAULT true,
        sms_enabled                 BOOLEAN NOT NULL DEFAULT false,
        push_enabled                BOOLEAN NOT NULL DEFAULT true,
        in_app_enabled              BOOLEAN NOT NULL DEFAULT true,
        webhook_enabled             BOOLEAN NOT NULL DEFAULT false,
        quiet_hours_start           VARCHAR(8),
        quiet_hours_end             VARCHAR(8),
        quiet_hours_timezone        VARCHAR(64),
        delivery_frequency          VARCHAR(32) NOT NULL DEFAULT 'IMMEDIATE',
        digest_time                 VARCHAR(8),
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_notification_preferences_user 
          FOREIGN KEY (user_id) 
          REFERENCES employees(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_notification_preferences_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for notification_preferences
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_preferences_user 
      ON notification_preferences (user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_preferences_organization 
      ON notification_preferences (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_preferences_template 
      ON notification_preferences (template_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_preferences_category 
      ON notification_preferences (category)
    `);

    // Notifications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id                          BIGSERIAL PRIMARY KEY,
        template_id                 BIGINT,
        template_key                VARCHAR(128),
        channel                     VARCHAR(32) NOT NULL,
        user_id                     BIGINT NOT NULL,
        organization_id              BIGINT,
        title                       VARCHAR(255) NOT NULL,
        body                        TEXT NOT NULL,
        category                    VARCHAR(64),
        priority                    VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
        status                      VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        scheduled_at                 TIMESTAMPTZ,
        sent_at                     TIMESTAMPTZ,
        delivered_at                TIMESTAMPTZ,
        read_at                     TIMESTAMPTZ,
        failed_at                   TIMESTAMPTZ,
        failure_reason              TEXT,
        delivery_attempts           INTEGER NOT NULL DEFAULT 0,
        max_delivery_attempts        INTEGER NOT NULL DEFAULT 3,
        next_retry_at               TIMESTAMPTZ,
        recipient_email             VARCHAR(255),
        recipient_phone             VARCHAR(32),
        webhook_url                 VARCHAR(512),
        action_url                  VARCHAR(512),
        action_label                VARCHAR(128),
        related_entity_type         VARCHAR(128),
        related_entity_id           BIGINT,
        template_variables          JSONB,
        delivery_metadata           JSONB,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_notifications_template 
          FOREIGN KEY (template_id) 
          REFERENCES notification_templates(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_notifications_user 
          FOREIGN KEY (user_id) 
          REFERENCES employees(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_notifications_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for notifications
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user 
      ON notifications (user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_organization 
      ON notifications (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_template 
      ON notifications (template_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_status 
      ON notifications (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_channel 
      ON notifications (channel)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_priority 
      ON notifications (priority)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created 
      ON notifications (created_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_sent 
      ON notifications (sent_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_read 
      ON notifications (read_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_category 
      ON notifications (category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_pending 
      ON notifications (status, scheduled_at) 
      WHERE status = 'PENDING' AND (scheduled_at IS NULL OR scheduled_at <= now())
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_retryable 
      ON notifications (status, next_retry_at, delivery_attempts) 
      WHERE status = 'FAILED' AND delivery_attempts < max_delivery_attempts 
      AND (next_retry_at IS NULL OR next_retry_at <= now())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notifications_retryable
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notifications_pending
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notifications_category
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notifications_read
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notifications_sent
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notifications_created
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notifications_priority
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notifications_channel
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notifications_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notifications_template
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notifications_organization
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notifications_user
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notification_preferences_category
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notification_preferences_template
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notification_preferences_organization
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notification_preferences_user
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notification_templates_category
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notification_templates_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notification_templates_channel
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_notification_templates_key
    `);

    // Drop tables
    await queryRunner.query(`
      DROP TABLE IF EXISTS notifications CASCADE
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS notification_preferences CASCADE
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS notification_templates CASCADE
    `);
  }
}
