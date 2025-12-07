import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Inventory Management Migration
 * 
 * This migration creates:
 * - inventory_locations table (multi-location inventory with warehouse, bin tracking)
 * - inventory_items table (inventory items with SKU, categories, stock levels, locations)
 * - inventory_transactions table (stock movements: in, out, transfer, adjustment)
 * - Indexes for performance optimization
 * - Foreign key relationships
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Inventory0000000000027 implements MigrationInterface {
  name = 'Inventory0000000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Inventory Locations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_locations (
        id                          BIGSERIAL PRIMARY KEY,
        location_name               VARCHAR(255) NOT NULL,
        location_code               VARCHAR(64),
        location_description        TEXT,
        organization_id              BIGINT NOT NULL,
        parent_location_id           BIGINT,
        location_type               VARCHAR(64),
        address                     TEXT,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        location_metadata            JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_inventory_locations_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for inventory_locations
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_locations_organization 
      ON inventory_locations (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_locations_parent 
      ON inventory_locations (parent_location_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_locations_active 
      ON inventory_locations (is_active)
    `);

    // Self-referencing foreign key for parent location
    await queryRunner.query(`
      ALTER TABLE inventory_locations 
      ADD CONSTRAINT fk_inventory_locations_parent 
      FOREIGN KEY (parent_location_id) 
      REFERENCES inventory_locations(id) 
      ON DELETE SET NULL
    `);

    // Inventory Items table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id                          BIGSERIAL PRIMARY KEY,
        sku                         VARCHAR(128) UNIQUE NOT NULL,
        item_name                   VARCHAR(255) NOT NULL,
        item_description            TEXT,
        item_type                   VARCHAR(32) NOT NULL DEFAULT 'PRODUCT',
        category                    VARCHAR(128),
        item_status                 VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        organization_id              BIGINT NOT NULL,
        location_id                 BIGINT,
        stock_quantity              DECIMAL(15,2) NOT NULL DEFAULT 0,
        reserved_quantity           DECIMAL(15,2) NOT NULL DEFAULT 0,
        available_quantity          DECIMAL(15,2) NOT NULL DEFAULT 0,
        reorder_point                DECIMAL(15,2),
        reorder_quantity            DECIMAL(15,2),
        max_stock_level             DECIMAL(15,2),
        unit_of_measure             VARCHAR(32) DEFAULT 'pcs',
        cost_per_unit               DECIMAL(15,2),
        valuation_method            VARCHAR(32) DEFAULT 'AVERAGE',
        track_serial_numbers        BOOLEAN NOT NULL DEFAULT false,
        track_lot_numbers           BOOLEAN NOT NULL DEFAULT false,
        parent_item_id              BIGINT,
        bundle_components           JSONB,
        item_metadata               JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_inventory_items_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_inventory_items_location 
          FOREIGN KEY (location_id) 
          REFERENCES inventory_locations(id) 
          ON DELETE SET NULL
      )
    `);

    // Create indexes for inventory_items
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_items_sku 
      ON inventory_items (sku)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_items_category 
      ON inventory_items (category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_items_location 
      ON inventory_items (location_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_items_status 
      ON inventory_items (item_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_items_organization 
      ON inventory_items (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_items_type 
      ON inventory_items (item_type)
    `);

    // Composite index for low stock queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_items_low_stock 
      ON inventory_items (organization_id, item_status, stock_quantity, reorder_point)
    `);

    // Inventory Transactions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id                          BIGSERIAL PRIMARY KEY,
        item_id                     BIGINT NOT NULL,
        transaction_type            VARCHAR(32) NOT NULL,
        transaction_status          VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        transaction_date            DATE NOT NULL,
        quantity                    DECIMAL(15,2) NOT NULL,
        unit_cost                   DECIMAL(15,2),
        total_cost                  DECIMAL(15,2),
        location_id                 BIGINT,
        to_location_id              BIGINT,
        reference_number            VARCHAR(128),
        reference_type              VARCHAR(64),
        serial_numbers              JSONB,
        lot_number                  VARCHAR(128),
        expiry_date                 DATE,
        notes                       TEXT,
        stock_before                DECIMAL(15,2),
        stock_after                 DECIMAL(15,2),
        transaction_metadata        JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_inventory_transactions_item 
          FOREIGN KEY (item_id) 
          REFERENCES inventory_items(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_inventory_transactions_location 
          FOREIGN KEY (location_id) 
          REFERENCES inventory_locations(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_inventory_transactions_to_location 
          FOREIGN KEY (to_location_id) 
          REFERENCES inventory_locations(id) 
          ON DELETE SET NULL
      )
    `);

    // Create indexes for inventory_transactions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item 
      ON inventory_transactions (item_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type 
      ON inventory_transactions (transaction_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_status 
      ON inventory_transactions (transaction_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date 
      ON inventory_transactions (transaction_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_location 
      ON inventory_transactions (location_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference 
      ON inventory_transactions (reference_number)
    `);

    // Composite index for stock calculation queries (critical for performance)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_stock_calc 
      ON inventory_transactions (item_id, transaction_type, transaction_status, transaction_date)
    `);

    // Add comments to tables
    await queryRunner.query(`
      COMMENT ON TABLE inventory_locations IS 'Multi-location inventory support with warehouse, bin tracking';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE inventory_items IS 'Inventory items with SKU, categories, stock levels, locations, and valuation';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE inventory_transactions IS 'Stock movements (in, out, transfer, adjustment) with tracking';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN inventory_items.item_type IS 'PRODUCT, RAW_MATERIAL, COMPONENT, BUNDLE, ASSEMBLY, SERVICE';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN inventory_items.item_status IS 'ACTIVE, INACTIVE, DISCONTINUED';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN inventory_items.valuation_method IS 'FIFO, LIFO, AVERAGE';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN inventory_transactions.transaction_type IS 'RECEIPT, ISSUE, TRANSFER, ADJUSTMENT, RETURN, ASSEMBLY, DISASSEMBLY, WRITE_OFF';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN inventory_transactions.transaction_status IS 'PENDING, COMPLETED, CANCELLED';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_transactions_stock_calc
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_transactions_reference
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_transactions_location
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_transactions_date
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_transactions_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_transactions_type
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_transactions_item
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_items_low_stock
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_items_type
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_items_organization
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_items_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_items_location
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_items_category
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_items_sku
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_locations_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_locations_parent
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_locations_organization
    `);

    // Drop tables (transactions first due to foreign keys)
    await queryRunner.query(`
      DROP TABLE IF EXISTS inventory_transactions CASCADE
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS inventory_items CASCADE
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS inventory_locations CASCADE
    `);
  }
}
