import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Financial Accounting Module Migration
 * 
 * This migration creates:
 * - accounts table (chart of accounts with account types, categories, hierarchy)
 * - financial_transactions table (journal entries with double-entry bookkeeping)
 * - transaction_line_items table (debit/credit entries)
 * - invoices table (invoice generation and tracking)
 * - invoice_line_items table (invoice line items)
 * - payments table (payment tracking and reconciliation)
 * - payment_allocations table (allocate payments to invoices)
 * - account_balances table (cached account balances)
 * - Indexes and functions for performance
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class FinancialAccounting0000000000039 implements MigrationInterface {
  name = 'FinancialAccounting0000000000039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Accounts table - Chart of accounts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id                          BIGSERIAL PRIMARY KEY,
        account_number              VARCHAR(64) UNIQUE NOT NULL,
        account_name                VARCHAR(255) NOT NULL,
        account_type                VARCHAR(32) NOT NULL,
        account_category            VARCHAR(64) NOT NULL,
        account_subcategory         VARCHAR(128),
        parent_account_id           BIGINT,
        account_level               INTEGER NOT NULL DEFAULT 1,
        account_path                VARCHAR(512),
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_system_account           BOOLEAN NOT NULL DEFAULT false,
        is_summary_account          BOOLEAN NOT NULL DEFAULT false,
        normal_balance              VARCHAR(8) NOT NULL DEFAULT 'DEBIT',
        opening_balance             DECIMAL(15,2) NOT NULL DEFAULT 0,
        current_balance             DECIMAL(15,2) NOT NULL DEFAULT 0,
        balance_as_of_date          DATE,
        currency_id                 BIGINT,
        currency                    VARCHAR(8) NOT NULL DEFAULT 'USD',
        allows_postings             BOOLEAN NOT NULL DEFAULT true,
        requires_approval           BOOLEAN NOT NULL DEFAULT false,
        reconcile_required          BOOLEAN NOT NULL DEFAULT false,
        is_bank_account             BOOLEAN NOT NULL DEFAULT false,
        is_tax_account              BOOLEAN NOT NULL DEFAULT false,
        description                 TEXT,
        tax_code                    VARCHAR(64),
        cost_center_id              BIGINT,
        department_id               BIGINT,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_accounts_parent 
          FOREIGN KEY (parent_account_id) 
          REFERENCES accounts(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_accounts_currency 
          FOREIGN KEY (currency_id) 
          REFERENCES currencies(id) 
          ON DELETE RESTRICT
      )
    `);

    // Create indexes for accounts
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_accounts_number 
      ON accounts (account_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_accounts_type 
      ON accounts (account_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_accounts_category 
      ON accounts (account_category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_accounts_parent 
      ON accounts (parent_account_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_accounts_active 
      ON accounts (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_accounts_path 
      ON accounts (account_path)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_accounts_currency 
      ON accounts (currency_id)
    `);

    // Financial Transactions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS financial_transactions (
        id                          BIGSERIAL PRIMARY KEY,
        transaction_number          VARCHAR(64) UNIQUE NOT NULL,
        transaction_date            DATE NOT NULL,
        transaction_type            VARCHAR(32) NOT NULL,
        transaction_reference       VARCHAR(128),
        description                 TEXT NOT NULL,
        memo                        TEXT,
        status                      VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
        is_reversed                 BOOLEAN NOT NULL DEFAULT false,
        reversal_transaction_id     BIGINT,
        reversed_transaction_id     BIGINT,
        requires_approval           BOOLEAN NOT NULL DEFAULT false,
        approved_by                 BIGINT,
        approved_at                 TIMESTAMPTZ,
        rejected_by                 BIGINT,
        rejected_at                 TIMESTAMPTZ,
        rejection_reason            TEXT,
        currency_id                 BIGINT,
        currency                    VARCHAR(8) NOT NULL DEFAULT 'USD',
        exchange_rate               DECIMAL(20,8),
        total_debits                DECIMAL(15,2) NOT NULL DEFAULT 0,
        total_credits               DECIMAL(15,2) NOT NULL DEFAULT 0,
        is_balanced                 BOOLEAN NOT NULL DEFAULT false,
        entity_type                 VARCHAR(128),
        entity_id                   BIGINT,
        metadata                    JSONB,
        posted_at                   TIMESTAMPTZ,
        posted_by                   BIGINT,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_financial_transactions_reversal 
          FOREIGN KEY (reversal_transaction_id) 
          REFERENCES financial_transactions(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_financial_transactions_reversed 
          FOREIGN KEY (reversed_transaction_id) 
          REFERENCES financial_transactions(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_financial_transactions_currency 
          FOREIGN KEY (currency_id) 
          REFERENCES currencies(id) 
          ON DELETE RESTRICT
      )
    `);

    // Create indexes for financial_transactions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_transactions_number 
      ON financial_transactions (transaction_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_transactions_date 
      ON financial_transactions (transaction_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_transactions_type 
      ON financial_transactions (transaction_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_transactions_status 
      ON financial_transactions (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_transactions_reference 
      ON financial_transactions (transaction_reference)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_transactions_entity 
      ON financial_transactions (entity_type, entity_id) 
      WHERE entity_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_transactions_posted 
      ON financial_transactions (posted_at) 
      WHERE posted_at IS NOT NULL
    `);

    // Transaction Line Items table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS transaction_line_items (
        id                          BIGSERIAL PRIMARY KEY,
        transaction_id              BIGINT NOT NULL,
        line_number                 INTEGER NOT NULL,
        account_id                  BIGINT NOT NULL,
        debit_amount                DECIMAL(15,2) NOT NULL DEFAULT 0,
        credit_amount               DECIMAL(15,2) NOT NULL DEFAULT 0,
        description                 TEXT,
        memo                        TEXT,
        entity_type                 VARCHAR(128),
        entity_id                   BIGINT,
        cost_center_id              BIGINT,
        department_id               BIGINT,
        project_id                  BIGINT,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_transaction_line_items_transaction 
          FOREIGN KEY (transaction_id) 
          REFERENCES financial_transactions(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_transaction_line_items_account 
          FOREIGN KEY (account_id) 
          REFERENCES accounts(id) 
          ON DELETE RESTRICT,
        UNIQUE(transaction_id, line_number)
      )
    `);

    // Create indexes for transaction_line_items
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transaction_line_items_transaction 
      ON transaction_line_items (transaction_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transaction_line_items_account 
      ON transaction_line_items (account_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transaction_line_items_entity 
      ON transaction_line_items (entity_type, entity_id) 
      WHERE entity_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transaction_line_items_project 
      ON transaction_line_items (project_id) 
      WHERE project_id IS NOT NULL
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE accounts IS 'Chart of accounts with account types, categories, and hierarchy';
      COMMENT ON COLUMN accounts.account_type IS 'ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE';
      COMMENT ON COLUMN accounts.normal_balance IS 'DEBIT, CREDIT - Normal balance side for the account type';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE financial_transactions IS 'Financial transactions with double-entry bookkeeping support';
      COMMENT ON COLUMN financial_transactions.transaction_type IS 'JOURNAL_ENTRY, INVOICE, PAYMENT, RECEIPT, ADJUSTMENT, TRANSFER';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE transaction_line_items IS 'Transaction line items with debit/credit entries for double-entry bookkeeping';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (due to foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS transaction_line_items CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS financial_transactions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS accounts CASCADE`);
  }
}
