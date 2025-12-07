import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-Currency Support Migration
 *
 * This migration creates:
 * - currencies table (currency definitions with ISO codes, symbols, decimal places)
 * - exchange_rates table (historical exchange rates with effective dates, bid/ask rates)
 * - Indexes for performance optimization
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class MultiCurrency0000000000038 implements MigrationInterface {
  name = 'MultiCurrency0000000000038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Currencies table - Currency definitions with ISO 4217 codes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS currencies (
        id                          BIGSERIAL PRIMARY KEY,
        code                        VARCHAR(3) NOT NULL UNIQUE,
        name                        VARCHAR(255) NOT NULL,
        symbol                      VARCHAR(10),
        decimal_places              INTEGER NOT NULL DEFAULT 2,
        status                      VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        organization_id             BIGINT,
        is_default                  BOOLEAN NOT NULL DEFAULT false,
        display_format              VARCHAR(128),
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for currencies
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_currencies_code 
      ON currencies (code)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_currencies_status 
      ON currencies (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_currencies_organization 
      ON currencies (organization_id)
    `);

    // Exchange Rates table - Historical exchange rates with effective dates
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS exchange_rates (
        id                          BIGSERIAL PRIMARY KEY,
        from_currency_id            BIGINT NOT NULL,
        to_currency_id              BIGINT NOT NULL,
        rate                        DECIMAL(18, 8) NOT NULL,
        bid_rate                    DECIMAL(18, 8),
        ask_rate                    DECIMAL(18, 8),
        effective_date              DATE NOT NULL,
        expiry_date                 DATE,
        source                      VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
        organization_id             BIGINT,
        is_default                  BOOLEAN NOT NULL DEFAULT false,
        notes                       TEXT,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_exchange_rates_from_currency 
          FOREIGN KEY (from_currency_id) 
          REFERENCES currencies(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_exchange_rates_to_currency 
          FOREIGN KEY (to_currency_id) 
          REFERENCES currencies(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for exchange_rates
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_exchange_rates_from_currency 
      ON exchange_rates (from_currency_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_exchange_rates_to_currency 
      ON exchange_rates (to_currency_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_exchange_rates_effective_date 
      ON exchange_rates (effective_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_exchange_rates_organization 
      ON exchange_rates (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency_pair 
      ON exchange_rates (from_currency_id, to_currency_id, effective_date)
    `);

    // Insert common currencies
    await queryRunner.query(`
      INSERT INTO currencies (code, name, symbol, decimal_places, status, is_default, display_format, created_at, updated_at)
      VALUES 
        ('USD', 'US Dollar', '$', 2, 'ACTIVE', true, '{symbol}{amount}', now(), now()),
        ('EUR', 'Euro', '€', 2, 'ACTIVE', false, '{amount} {symbol}', now(), now()),
        ('GBP', 'British Pound', '£', 2, 'ACTIVE', false, '{symbol}{amount}', now(), now()),
        ('JPY', 'Japanese Yen', '¥', 0, 'ACTIVE', false, '{symbol}{amount}', now(), now()),
        ('AUD', 'Australian Dollar', 'A$', 2, 'ACTIVE', false, '{symbol}{amount}', now(), now()),
        ('CAD', 'Canadian Dollar', 'C$', 2, 'ACTIVE', false, '{symbol}{amount}', now(), now()),
        ('CHF', 'Swiss Franc', 'CHF', 2, 'ACTIVE', false, '{amount} {symbol}', now(), now()),
        ('CNY', 'Chinese Yuan', '¥', 2, 'ACTIVE', false, '{symbol}{amount}', now(), now()),
        ('INR', 'Indian Rupee', '₹', 2, 'ACTIVE', false, '{symbol}{amount}', now(), now()),
        ('SGD', 'Singapore Dollar', 'S$', 2, 'ACTIVE', false, '{symbol}{amount}', now(), now())
      ON CONFLICT (code) DO NOTHING
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE currencies IS 'Currency definitions with ISO 4217 codes, symbols, decimal places, and display formats';
      COMMENT ON COLUMN currencies.code IS 'ISO 4217 currency code (e.g., USD, EUR, GBP)';
      COMMENT ON COLUMN currencies.decimal_places IS 'Number of decimal places for currency formatting (e.g., 2 for USD, 0 for JPY)';
      COMMENT ON COLUMN currencies.status IS 'Currency status: ACTIVE, INACTIVE, ARCHIVED';
      COMMENT ON COLUMN currencies.organization_id IS 'Organization this currency is associated with (null for global currencies)';
      COMMENT ON COLUMN currencies.is_default IS 'Whether this is the default currency for the organization';
      COMMENT ON COLUMN currencies.display_format IS 'Display format template (e.g., "{symbol}{amount}", "{amount} {code}")';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE exchange_rates IS 'Exchange rates between currencies with historical tracking, effective dates, and bid/ask rates';
      COMMENT ON COLUMN exchange_rates.rate IS 'Exchange rate (1 unit of from_currency = rate units of to_currency)';
      COMMENT ON COLUMN exchange_rates.bid_rate IS 'Bid rate (for buying to_currency with from_currency)';
      COMMENT ON COLUMN exchange_rates.ask_rate IS 'Ask rate (for selling to_currency for from_currency)';
      COMMENT ON COLUMN exchange_rates.effective_date IS 'Date when this exchange rate becomes effective';
      COMMENT ON COLUMN exchange_rates.expiry_date IS 'Date when this exchange rate expires (null if current/indefinite)';
      COMMENT ON COLUMN exchange_rates.source IS 'Rate source: MANUAL, API, IMPORT, CALCULATED';
      COMMENT ON COLUMN exchange_rates.organization_id IS 'Organization this rate is associated with (null for global rates)';
      COMMENT ON COLUMN exchange_rates.is_default IS 'Whether this is the default rate for the currency pair';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (due to foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS exchange_rates CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS currencies CASCADE`);
  }
}
