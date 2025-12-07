import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Help Center & Ticketing Migration
 *
 * This migration creates:
 * - ticket_categories table (categories for organizing tickets)
 * - ticket_slas table (Service Level Agreements with response/resolution times)
 * - support_tickets table (support tickets with lifecycle, SLA tracking, assignment)
 * - ticket_comments table (comments on tickets)
 * - ticket_attachments table (file attachments)
 * - ticket_time_entries table (time tracking for tickets)
 * - Indexes for performance optimization
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class HelpCenter0000000000037 implements MigrationInterface {
  name = 'HelpCenter0000000000037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ticket Categories table - Categories for organizing support tickets
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ticket_categories (
        id                          BIGSERIAL PRIMARY KEY,
        name                        VARCHAR(255) NOT NULL,
        description                 TEXT,
        organization_id             BIGINT,
        default_sla_id              BIGINT,
        default_assignee_id         BIGINT,
        display_order               INTEGER NOT NULL DEFAULT 0,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        icon                        VARCHAR(512),
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_ticket_categories_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for ticket_categories
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_categories_organization 
      ON ticket_categories (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_categories_active 
      ON ticket_categories (is_active)
    `);

    // Ticket SLAs table - Service Level Agreements
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ticket_slas (
        id                          BIGSERIAL PRIMARY KEY,
        name                        VARCHAR(255) NOT NULL,
        description                 TEXT,
        organization_id             BIGINT,
        first_response_time         INTEGER NOT NULL,
        first_response_time_unit    VARCHAR(32) NOT NULL DEFAULT 'HOURS',
        resolution_time             INTEGER NOT NULL,
        resolution_time_unit        VARCHAR(32) NOT NULL DEFAULT 'HOURS',
        business_hours               JSONB,
        business_hours_only         BOOLEAN NOT NULL DEFAULT false,
        priority_overrides          JSONB,
        escalation_rules            JSONB,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_default                  BOOLEAN NOT NULL DEFAULT false,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_ticket_slas_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for ticket_slas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_slas_organization 
      ON ticket_slas (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_slas_active 
      ON ticket_slas (is_active)
    `);

    // Support Tickets table - Main ticket table with lifecycle and SLA tracking
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id                          BIGSERIAL PRIMARY KEY,
        ticket_number               VARCHAR(128) NOT NULL UNIQUE,
        subject                     VARCHAR(255) NOT NULL,
        description                 TEXT NOT NULL,
        status                      VARCHAR(32) NOT NULL DEFAULT 'OPEN',
        priority                    VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
        category_id                 BIGINT,
        organization_id             BIGINT NOT NULL,
        requester_id                BIGINT NOT NULL,
        assigned_to_id              BIGINT,
        sla_id                      BIGINT,
        first_response_due_at       TIMESTAMPTZ,
        first_response_at           TIMESTAMPTZ,
        resolution_due_at          TIMESTAMPTZ,
        resolved_at                 TIMESTAMPTZ,
        closed_at                   TIMESTAMPTZ,
        total_time_minutes          INTEGER NOT NULL DEFAULT 0,
        tags                        JSONB,
        custom_fields               JSONB,
        satisfaction_rating         INTEGER,
        satisfaction_feedback       TEXT,
        is_escalated                BOOLEAN NOT NULL DEFAULT false,
        escalation_reason           TEXT,
        escalated_at                TIMESTAMPTZ,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_support_tickets_category 
          FOREIGN KEY (category_id) 
          REFERENCES ticket_categories(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_support_tickets_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_support_tickets_requester 
          FOREIGN KEY (requester_id) 
          REFERENCES employees(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_support_tickets_assigned_to 
          FOREIGN KEY (assigned_to_id) 
          REFERENCES employees(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_support_tickets_sla 
          FOREIGN KEY (sla_id) 
          REFERENCES ticket_slas(id) 
          ON DELETE SET NULL
      )
    `);

    // Create indexes for support_tickets
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status 
      ON support_tickets (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_priority 
      ON support_tickets (priority)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_category 
      ON support_tickets (category_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_organization 
      ON support_tickets (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee 
      ON support_tickets (assigned_to_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_requester 
      ON support_tickets (requester_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_created 
      ON support_tickets (created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number 
      ON support_tickets (ticket_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_sla_due 
      ON support_tickets (first_response_due_at, resolution_due_at)
    `);

    // Ticket Comments table - Comments on tickets
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ticket_comments (
        id                          BIGSERIAL PRIMARY KEY,
        ticket_id                   BIGINT NOT NULL,
        author_id                   BIGINT,
        content                     TEXT NOT NULL,
        comment_type                VARCHAR(32) NOT NULL DEFAULT 'PUBLIC',
        is_customer_comment         BOOLEAN NOT NULL DEFAULT false,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_ticket_comments_ticket 
          FOREIGN KEY (ticket_id) 
          REFERENCES support_tickets(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_ticket_comments_author 
          FOREIGN KEY (author_id) 
          REFERENCES employees(id) 
          ON DELETE SET NULL
      )
    `);

    // Create indexes for ticket_comments
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket 
      ON ticket_comments (ticket_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_comments_author 
      ON ticket_comments (author_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_comments_created 
      ON ticket_comments (created_at DESC)
    `);

    // Ticket Attachments table - File attachments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ticket_attachments (
        id                          BIGSERIAL PRIMARY KEY,
        ticket_id                   BIGINT NOT NULL,
        attachment_name             VARCHAR(255) NOT NULL,
        attachment_type             VARCHAR(64),
        file_path                   VARCHAR(512) NOT NULL,
        file_size                   BIGINT,
        uploaded_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
        uploaded_by                 BIGINT,
        CONSTRAINT fk_ticket_attachments_ticket 
          FOREIGN KEY (ticket_id) 
          REFERENCES support_tickets(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for ticket_attachments
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket 
      ON ticket_attachments (ticket_id)
    `);

    // Ticket Time Entries table - Time tracking
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ticket_time_entries (
        id                          BIGSERIAL PRIMARY KEY,
        ticket_id                   BIGINT NOT NULL,
        employee_id                 BIGINT NOT NULL,
        date                        DATE NOT NULL,
        time_minutes                INTEGER NOT NULL,
        description                 TEXT,
        is_billable                 BOOLEAN NOT NULL DEFAULT false,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        CONSTRAINT fk_ticket_time_entries_ticket 
          FOREIGN KEY (ticket_id) 
          REFERENCES support_tickets(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_ticket_time_entries_employee 
          FOREIGN KEY (employee_id) 
          REFERENCES employees(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for ticket_time_entries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_time_entries_ticket 
      ON ticket_time_entries (ticket_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_time_entries_employee 
      ON ticket_time_entries (employee_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ticket_time_entries_date 
      ON ticket_time_entries (date DESC)
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE ticket_categories IS 'Categories for organizing support tickets with default SLA and assignee';
      COMMENT ON COLUMN ticket_categories.default_sla_id IS 'Default SLA to apply to tickets in this category';
      COMMENT ON COLUMN ticket_categories.default_assignee_id IS 'Default assignee for tickets in this category';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE ticket_slas IS 'Service Level Agreements with first response time, resolution time, business hours, priority overrides, and escalation rules';
      COMMENT ON COLUMN ticket_slas.first_response_time IS 'First response time in the specified unit';
      COMMENT ON COLUMN ticket_slas.resolution_time IS 'Resolution time in the specified unit';
      COMMENT ON COLUMN ticket_slas.business_hours IS 'JSON: Business hours configuration { start: "09:00", end: "17:00", timezone: "UTC", days: [1,2,3,4,5] }';
      COMMENT ON COLUMN ticket_slas.priority_overrides IS 'JSON: Priority-based SLA overrides { "URGENT": { firstResponseTime: 30, resolutionTime: 240 } }';
      COMMENT ON COLUMN ticket_slas.escalation_rules IS 'JSON: Escalation rules { "firstResponseOverdue": { escalateTo: "manager", notify: true } }';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE support_tickets IS 'Support tickets with lifecycle (open, assigned, in-progress, resolved, closed), SLA tracking, assignment, time tracking, and escalation';
      COMMENT ON COLUMN support_tickets.status IS 'Ticket status: OPEN, ASSIGNED, IN_PROGRESS, WAITING_CUSTOMER, RESOLVED, CLOSED, CANCELLED';
      COMMENT ON COLUMN support_tickets.priority IS 'Ticket priority: LOW, MEDIUM, HIGH, URGENT, CRITICAL';
      COMMENT ON COLUMN support_tickets.ticket_number IS 'Unique ticket number (e.g., TKT-2024-001)';
      COMMENT ON COLUMN support_tickets.first_response_due_at IS 'SLA: First response due date';
      COMMENT ON COLUMN support_tickets.resolution_due_at IS 'SLA: Resolution due date';
      COMMENT ON COLUMN support_tickets.tags IS 'JSON array: Tags for categorization';
      COMMENT ON COLUMN support_tickets.custom_fields IS 'JSON: Custom fields for ticket';
      COMMENT ON COLUMN support_tickets.satisfaction_rating IS 'Customer satisfaction rating (1-5)';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE ticket_comments IS 'Comments on support tickets';
      COMMENT ON COLUMN ticket_comments.comment_type IS 'Comment type: PUBLIC, INTERNAL, SYSTEM';
      COMMENT ON COLUMN ticket_comments.is_customer_comment IS 'Whether comment is from customer/requester';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE ticket_attachments IS 'File attachments for support tickets';
      COMMENT ON TABLE ticket_time_entries IS 'Time tracking entries for support tickets';
      COMMENT ON COLUMN ticket_time_entries.is_billable IS 'Whether time is billable to customer';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (due to foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS ticket_time_entries CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS ticket_attachments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS ticket_comments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS support_tickets CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS ticket_slas CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS ticket_categories CASCADE`);
  }
}
