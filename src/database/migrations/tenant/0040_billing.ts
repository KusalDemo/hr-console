import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Billing & Invoicing Engine Migration
 * 
 * This migration creates:
 * - billing_rules table (subscription-based and usage-based billing rules)
 * - recurring_invoices table (recurring invoice schedules)
 * - Indexes for performance optimization
 * - Updates invoices table with billing-related fields
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Billing0000000000040 implements MigrationInterface {
  name = 'Billing0000000000040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Billing Rules table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS billing_rules (
        id                          BIGSERIAL PRIMARY KEY,
        rule_name                   VARCHAR(255) NOT NULL,
        rule_key                    VARCHAR(128) UNIQUE NOT NULL,
        billing_type                VARCHAR(32) NOT NULL,
        billing_frequency           VARCHAR(32) NOT NULL,
        billing_interval            INTEGER NOT NULL DEFAULT 1,
        trigger_type                VARCHAR(32) NOT NULL,
        trigger_event               VARCHAR(128),
        source_type                 VARCHAR(128) NOT NULL,
        source_entity_id            BIGINT,
        source_filter               JSONB,
        pricing_model               VARCHAR(32) NOT NULL,
        base_price                  DECIMAL(15,2),
        unit_price                  DECIMAL(15,2),
        currency_id                 BIGINT,
        currency                    VARCHAR(8) NOT NULL DEFAULT 'USD',
        pricing_config              JSONB,
        tax_rate                    DECIMAL(5,2) NOT NULL DEFAULT 0,
        tax_included                BOOLEAN NOT NULL DEFAULT false,
        discount_percentage         DECIMAL(5,2) NOT NULL DEFAULT 0,
        discount_amount             DECIMAL(15,2) NOT NULL DEFAULT 0,
        billing_period_start        DATE,
        billing_period_end          DATE,
        billing_day                 INTEGER,
        is_recurring                BOOLEAN NOT NULL DEFAULT false,
        recurrence_pattern          VARCHAR(64),
        recurrence_interval         INTEGER DEFAULT 1,
        recurrence_end_date         DATE,
        recurrence_count            INTEGER,
        next_billing_date           DATE,
        status                      VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        invoice_template_id         BIGINT,
        auto_generate_invoice       BOOLEAN NOT NULL DEFAULT true,
        auto_send_invoice           BOOLEAN NOT NULL DEFAULT false,
        payment_terms               VARCHAR(128),
        due_date_days               INTEGER DEFAULT 30,
        requires_approval           BOOLEAN NOT NULL DEFAULT false,
        approval_workflow_id        BIGINT,
        description                 TEXT,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_billing_rules_currency 
          FOREIGN KEY (currency_id) 
          REFERENCES currencies(id) 
          ON DELETE RESTRICT
      )
    `);

    // Create indexes for billing_rules
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_rules_key 
      ON billing_rules (rule_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_rules_type 
      ON billing_rules (billing_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_rules_status 
      ON billing_rules (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_rules_active 
      ON billing_rules (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_rules_next_billing 
      ON billing_rules (next_billing_date) 
      WHERE next_billing_date IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_rules_source 
      ON billing_rules (source_type, source_entity_id)
    `);

    // Recurring Invoices table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS recurring_invoices (
        id                          BIGSERIAL PRIMARY KEY,
        recurring_invoice_number    VARCHAR(64) UNIQUE NOT NULL,
        invoice_template_id         BIGINT,
        billing_rule_id             BIGINT,
        client_id                   BIGINT,
        contact_id                  BIGINT,
        bill_to_contact_id          BIGINT,
        recurrence_type             VARCHAR(32) NOT NULL,
        recurrence_interval         INTEGER NOT NULL DEFAULT 1,
        recurrence_day              INTEGER,
        recurrence_end_date         DATE,
        recurrence_count            INTEGER,
        next_invoice_date           DATE NOT NULL,
        base_subtotal               DECIMAL(15,2) NOT NULL DEFAULT 0,
        base_tax_amount             DECIMAL(15,2) NOT NULL DEFAULT 0,
        base_total_amount           DECIMAL(15,2) NOT NULL DEFAULT 0,
        currency_id                 BIGINT,
        currency                    VARCHAR(8) NOT NULL DEFAULT 'USD',
        payment_terms               VARCHAR(128),
        due_date_days               INTEGER DEFAULT 30,
        status                      VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        auto_generate               BOOLEAN NOT NULL DEFAULT true,
        auto_send                   BOOLEAN NOT NULL DEFAULT false,
        send_reminders               BOOLEAN NOT NULL DEFAULT false,
        reminder_days_before_due    INTEGER,
        total_invoices_generated    INTEGER NOT NULL DEFAULT 0,
        last_invoice_date           DATE,
        last_invoice_id             BIGINT,
        description                 TEXT,
        notes                       TEXT,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_recurring_invoices_currency 
          FOREIGN KEY (currency_id) 
          REFERENCES currencies(id) 
          ON DELETE RESTRICT,
        CONSTRAINT fk_recurring_invoices_billing_rule 
          FOREIGN KEY (billing_rule_id) 
          REFERENCES billing_rules(id) 
          ON DELETE SET NULL
      )
    `);

    // Create indexes for recurring_invoices
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_recurring_invoices_number 
      ON recurring_invoices (recurring_invoice_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_recurring_invoices_status 
      ON recurring_invoices (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_recurring_invoices_active 
      ON recurring_invoices (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_date 
      ON recurring_invoices (next_invoice_date) 
      WHERE next_invoice_date IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_recurring_invoices_client 
      ON recurring_invoices (client_id) 
      WHERE client_id IS NOT NULL
    `);

    // Add billing-related columns to invoices table
    await queryRunner.query(`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS recurring_invoice_id BIGINT
    `);

    await queryRunner.query(`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS billing_rule_id BIGINT
    `);

    await queryRunner.query(`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS invoice_template_id BIGINT
    `);

    await queryRunner.query(`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS payment_gateway_id BIGINT
    `);

    // Create indexes for invoices billing fields
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_recurring 
      ON invoices (recurring_invoice_id) 
      WHERE recurring_invoice_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_billing_rule 
      ON invoices (billing_rule_id) 
      WHERE billing_rule_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_template 
      ON invoices (invoice_template_id) 
      WHERE invoice_template_id IS NOT NULL
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE billing_rules IS 'Rules for subscription-based or usage-based billing with recurrence patterns';
      COMMENT ON COLUMN billing_rules.billing_type IS 'SUBSCRIPTION, USAGE_BASED, FIXED, HYBRID';
      COMMENT ON COLUMN billing_rules.trigger_type IS 'AUTOMATIC, MANUAL, EVENT_BASED';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE recurring_invoices IS 'Recurring invoice schedules with automatic generation and delivery';
      COMMENT ON COLUMN recurring_invoices.recurrence_type IS 'DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invoices_template`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invoices_billing_rule`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invoices_recurring`);

    // Drop columns from invoices
    await queryRunner.query(`ALTER TABLE invoices DROP COLUMN IF EXISTS payment_gateway_id`);
    await queryRunner.query(`ALTER TABLE invoices DROP COLUMN IF EXISTS invoice_template_id`);
    await queryRunner.query(`ALTER TABLE invoices DROP COLUMN IF EXISTS billing_rule_id`);
    await queryRunner.query(`ALTER TABLE invoices DROP COLUMN IF EXISTS recurring_invoice_id`);

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS recurring_invoices CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS billing_rules CASCADE`);
  }
}
