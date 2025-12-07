import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Clients Vendors Migration
 * 
 * This migration creates:
 * - clients table (client relationship management with SLA tracking, contract management)
 * - vendors table (vendor relationship management with performance tracking)
 * - purchase_orders table (purchase orders for vendor procurement)
 * - purchase_order_items table (PO line items)
 * - vendor_ratings table (vendor performance ratings)
 * - vendor_certifications table (vendor certifications)
 * - contracts table (contracts and agreements with renewal management)
 * - Full-text search indexes
 * - Foreign key relationships
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class ClientsVendors0000000000021 implements MigrationInterface {
  name = 'ClientsVendors0000000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Clients table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id                          BIGSERIAL PRIMARY KEY,
        client_number               VARCHAR(64) UNIQUE,
        contact_id                  BIGINT,
        client_status               VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        client_tier                 VARCHAR(32),
        organization_id             BIGINT,
        account_manager_id          BIGINT,
        client_since                DATE,
        annual_revenue              DECIMAL(15,2),
        currency_code                VARCHAR(3) DEFAULT 'USD',
        industry                    VARCHAR(128),
        number_of_employees         INTEGER,
        website                     VARCHAR(255),
        billing_address_line1       VARCHAR(255),
        billing_address_line2       VARCHAR(255),
        billing_city                VARCHAR(128),
        billing_state               VARCHAR(128),
        billing_postal_code         VARCHAR(32),
        billing_country             VARCHAR(64),
        payment_terms               VARCHAR(64),
        credit_limit                DECIMAL(15,2),
        tax_id                      VARCHAR(64),
        tags                        TEXT,
        notes                       TEXT,
        client_metadata              JSONB,
        total_contract_value         DECIMAL(15,2),
        last_project_date           DATE,
        total_projects               INTEGER NOT NULL DEFAULT 0,
        active_projects              INTEGER NOT NULL DEFAULT 0,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_archived                 BOOLEAN NOT NULL DEFAULT false,
        archived_at                 TIMESTAMPTZ,
        archived_by                 BIGINT,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for clients
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_number 
      ON clients (client_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_status 
      ON clients (client_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_tier 
      ON clients (client_tier)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_contact 
      ON clients (contact_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_organization 
      ON clients (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_active 
      ON clients (is_active)
    `);

    // Foreign key to contacts (if contacts table exists)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
          ALTER TABLE clients 
          ADD CONSTRAINT fk_clients_contact 
          FOREIGN KEY (contact_id) 
          REFERENCES contacts(id) 
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Vendors table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id                          BIGSERIAL PRIMARY KEY,
        vendor_number               VARCHAR(64) UNIQUE,
        contact_id                  BIGINT,
        vendor_type                 VARCHAR(32) NOT NULL DEFAULT 'OTHER',
        vendor_status               VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        organization_id             BIGINT,
        vendor_manager_id           BIGINT,
        vendor_since                DATE,
        industry                    VARCHAR(128),
        website                     VARCHAR(255),
        billing_address_line1       VARCHAR(255),
        billing_address_line2       VARCHAR(255),
        billing_city                VARCHAR(128),
        billing_state               VARCHAR(128),
        billing_postal_code         VARCHAR(32),
        billing_country             VARCHAR(64),
        payment_terms               VARCHAR(64),
        tax_id                      VARCHAR(64),
        average_rating              DECIMAL(3,2),
        total_ratings               INTEGER NOT NULL DEFAULT 0,
        total_purchase_orders       INTEGER NOT NULL DEFAULT 0,
        total_po_value              DECIMAL(15,2),
        currency_code                VARCHAR(3) DEFAULT 'USD',
        tags                        TEXT,
        notes                       TEXT,
        vendor_metadata              JSONB,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_archived                 BOOLEAN NOT NULL DEFAULT false,
        archived_at                 TIMESTAMPTZ,
        archived_by                 BIGINT,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for vendors
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vendors_number 
      ON vendors (vendor_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vendors_type 
      ON vendors (vendor_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vendors_status 
      ON vendors (vendor_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vendors_contact 
      ON vendors (contact_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vendors_organization 
      ON vendors (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vendors_active 
      ON vendors (is_active)
    `);

    // Foreign key to contacts
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
          ALTER TABLE vendors 
          ADD CONSTRAINT fk_vendors_contact 
          FOREIGN KEY (contact_id) 
          REFERENCES contacts(id) 
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Purchase Orders table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id                          BIGSERIAL PRIMARY KEY,
        po_number                   VARCHAR(64) UNIQUE NOT NULL,
        vendor_id                   BIGINT NOT NULL,
        po_status                   VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
        organization_id             BIGINT,
        po_date                     DATE NOT NULL,
        expected_delivery_date       DATE,
        actual_delivery_date         DATE,
        requested_by                BIGINT,
        approved_by                 BIGINT,
        approval_date               TIMESTAMPTZ,
        total_amount                DECIMAL(15,2) NOT NULL DEFAULT 0,
        currency_code                VARCHAR(3) NOT NULL DEFAULT 'USD',
        tax_amount                  DECIMAL(15,2) NOT NULL DEFAULT 0,
        shipping_amount             DECIMAL(15,2) NOT NULL DEFAULT 0,
        discount_amount             DECIMAL(15,2) NOT NULL DEFAULT 0,
        grand_total                 DECIMAL(15,2) NOT NULL DEFAULT 0,
        shipping_address_line1      VARCHAR(255),
        shipping_address_line2      VARCHAR(255),
        shipping_city               VARCHAR(128),
        shipping_state              VARCHAR(128),
        shipping_postal_code        VARCHAR(32),
        shipping_country             VARCHAR(64),
        terms_and_conditions        TEXT,
        notes                       TEXT,
        po_metadata                  JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for purchase_orders
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_po_number 
      ON purchase_orders (po_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_po_status 
      ON purchase_orders (po_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_po_vendor 
      ON purchase_orders (vendor_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_po_organization 
      ON purchase_orders (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_po_date 
      ON purchase_orders (po_date)
    `);

    // Foreign key to vendors
    await queryRunner.query(`
      ALTER TABLE purchase_orders 
      ADD CONSTRAINT fk_po_vendor 
      FOREIGN KEY (vendor_id) 
      REFERENCES vendors(id) 
      ON DELETE RESTRICT
    `);

    // Purchase Order Items table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id                          BIGSERIAL PRIMARY KEY,
        purchase_order_id           BIGINT NOT NULL,
        line_number                 INTEGER NOT NULL,
        item_description            VARCHAR(500) NOT NULL,
        item_sku                    VARCHAR(128),
        quantity_ordered            DECIMAL(15,3) NOT NULL,
        quantity_received           DECIMAL(15,3) NOT NULL DEFAULT 0,
        unit_price                 DECIMAL(15,2) NOT NULL,
        unit_of_measure             VARCHAR(32),
        line_total                 DECIMAL(15,2) NOT NULL,
        tax_rate                   DECIMAL(5,2) NOT NULL DEFAULT 0,
        tax_amount                 DECIMAL(15,2) NOT NULL DEFAULT 0,
        expected_delivery_date     DATE,
        actual_delivery_date        DATE,
        notes                      TEXT,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for purchase_order_items
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_po_items_po 
      ON purchase_order_items (purchase_order_id)
    `);

    // Foreign key to purchase_orders
    await queryRunner.query(`
      ALTER TABLE purchase_order_items 
      ADD CONSTRAINT fk_po_items_po 
      FOREIGN KEY (purchase_order_id) 
      REFERENCES purchase_orders(id) 
      ON DELETE CASCADE
    `);

    // Vendor Ratings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vendor_ratings (
        id                          BIGSERIAL PRIMARY KEY,
        vendor_id                   BIGINT NOT NULL,
        rating_category             VARCHAR(32) NOT NULL DEFAULT 'OVERALL',
        rating_value                INTEGER NOT NULL,
        rating_date                 DATE NOT NULL,
        rated_by                    BIGINT,
        related_po_id               BIGINT,
        related_project_id           BIGINT,
        comments                    TEXT,
        rating_metadata              JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for vendor_ratings
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_ratings_vendor 
      ON vendor_ratings (vendor_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_ratings_date 
      ON vendor_ratings (rating_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_ratings_category 
      ON vendor_ratings (rating_category)
    `);

    // Foreign key to vendors
    await queryRunner.query(`
      ALTER TABLE vendor_ratings 
      ADD CONSTRAINT fk_vendor_ratings_vendor 
      FOREIGN KEY (vendor_id) 
      REFERENCES vendors(id) 
      ON DELETE CASCADE
    `);

    // Vendor Certifications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vendor_certifications (
        id                          BIGSERIAL PRIMARY KEY,
        vendor_id                   BIGINT NOT NULL,
        certification_name          VARCHAR(255) NOT NULL,
        certification_type          VARCHAR(128),
        certification_number        VARCHAR(128),
        issuing_organization        VARCHAR(255),
        issue_date                  DATE,
        expiration_date             DATE,
        certification_status        VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        document_url                TEXT,
        notes                       TEXT,
        certification_metadata       JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for vendor_certifications
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_certs_vendor 
      ON vendor_certifications (vendor_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_certs_status 
      ON vendor_certifications (certification_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_certs_expiry 
      ON vendor_certifications (expiration_date)
    `);

    // Foreign key to vendors
    await queryRunner.query(`
      ALTER TABLE vendor_certifications 
      ADD CONSTRAINT fk_vendor_certs_vendor 
      FOREIGN KEY (vendor_id) 
      REFERENCES vendors(id) 
      ON DELETE CASCADE
    `);

    // Contracts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id                          BIGSERIAL PRIMARY KEY,
        contract_number             VARCHAR(128) UNIQUE NOT NULL,
        contract_key                VARCHAR(128) UNIQUE,
        client_id                   BIGINT,
        vendor_id                   BIGINT,
        contact_id                  BIGINT,
        contract_type               VARCHAR(32) NOT NULL DEFAULT 'OTHER',
        contract_category           VARCHAR(128),
        contract_status             VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
        contract_name               VARCHAR(255) NOT NULL,
        description                 TEXT,
        start_date                  DATE NOT NULL,
        end_date                    DATE,
        auto_renew                  BOOLEAN NOT NULL DEFAULT false,
        renewal_term_months         INTEGER,
        termination_notice_days     INTEGER,
        contract_value              DECIMAL(15,2),
        currency                    VARCHAR(8) NOT NULL DEFAULT 'USD',
        payment_schedule            VARCHAR(128),
        payment_amount              DECIMAL(15,2),
        contract_document_url        TEXT,
        signed_document_url          TEXT,
        terms_and_conditions         TEXT,
        signed_by_client            BOOLEAN NOT NULL DEFAULT false,
        signed_by_us                BOOLEAN NOT NULL DEFAULT false,
        client_signature_date       DATE,
        our_signature_date          DATE,
        signed_by_client_user        BIGINT,
        signed_by_us_user           BIGINT,
        renewal_date                DATE,
        renewal_status              VARCHAR(32),
        renewed_from_contract_id     BIGINT,
        renewed_to_contract_id       BIGINT,
        tags                        TEXT,
        custom_data                 JSONB,
        metadata                    JSONB,
        organization_id             BIGINT,
        approved_by                 BIGINT,
        approved_at                 TIMESTAMPTZ,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_archived                 BOOLEAN NOT NULL DEFAULT false,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT
      )
    `);

    // Create indexes for contracts
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_number 
      ON contracts (contract_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_key 
      ON contracts (contract_key) WHERE contract_key IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_client 
      ON contracts (client_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_vendor 
      ON contracts (vendor_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_type 
      ON contracts (contract_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_status 
      ON contracts (contract_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_renewal 
      ON contracts (renewal_date)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contracts_dates 
      ON contracts (start_date, end_date)
    `);

    // Foreign keys for contracts
    await queryRunner.query(`
      ALTER TABLE contracts 
      ADD CONSTRAINT fk_contracts_client 
      FOREIGN KEY (client_id) 
      REFERENCES clients(id) 
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE contracts 
      ADD CONSTRAINT fk_contracts_vendor 
      FOREIGN KEY (vendor_id) 
      REFERENCES vendors(id) 
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
          ALTER TABLE contracts 
          ADD CONSTRAINT fk_contracts_contact 
          FOREIGN KEY (contact_id) 
          REFERENCES contacts(id) 
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Self-referencing foreign keys for contract renewals
    await queryRunner.query(`
      ALTER TABLE contracts 
      ADD CONSTRAINT fk_contracts_renewed_from 
      FOREIGN KEY (renewed_from_contract_id) 
      REFERENCES contracts(id) 
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE contracts 
      ADD CONSTRAINT fk_contracts_renewed_to 
      FOREIGN KEY (renewed_to_contract_id) 
      REFERENCES contracts(id) 
      ON DELETE SET NULL
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE clients IS 'Client relationship management with SLA tracking, contract management, project history'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE vendors IS 'Vendor relationship management with performance tracking, ratings, and certifications'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE purchase_orders IS 'Purchase orders for vendor procurement with line items, approval workflow, and tracking'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE vendor_ratings IS 'Performance tracking and ratings for vendors with multiple rating categories'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE vendor_certifications IS 'Certifications and credentials for vendors with expiration tracking'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE contracts IS 'Contracts and agreements with renewal management, SLA tracking, and signature tracking'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS contracts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS vendor_certifications CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS vendor_ratings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_order_items CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_orders CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS vendors CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS clients CASCADE`);
  }
}

