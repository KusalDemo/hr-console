import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionTables0000000000002 implements MigrationInterface {
  name = 'CreateSubscriptionTables0000000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Subscription Plans - Available subscription plans
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin.subscription_plans (
        id                      BIGSERIAL PRIMARY KEY,
        plan_key                VARCHAR(128) UNIQUE NOT NULL,
        plan_name               VARCHAR(255) NOT NULL,
        description             TEXT,
        price                   DECIMAL(15,2) NOT NULL DEFAULT 0,
        currency                VARCHAR(8) NOT NULL DEFAULT 'USD',
        billing_cycle           VARCHAR(32) NOT NULL DEFAULT 'MONTHLY',
        billing_interval        INTEGER NOT NULL DEFAULT 1,
        max_users               INTEGER,
        max_organizations        INTEGER,
        max_storage_gb           INTEGER,
        features                JSONB,
        is_active               BOOLEAN NOT NULL DEFAULT true,
        is_default              BOOLEAN NOT NULL DEFAULT false,
        sort_order              INTEGER NOT NULL DEFAULT 0,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by              BIGINT,
        updated_by              BIGINT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscription_plans_key 
      ON admin.subscription_plans (plan_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscription_plans_active 
      ON admin.subscription_plans (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscription_plans_default 
      ON admin.subscription_plans (is_default) WHERE is_default = true
    `);

    // Subscriptions - Tenant subscriptions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin.subscriptions (
        id                      BIGSERIAL PRIMARY KEY,
        tenant_id               BIGINT NOT NULL REFERENCES admin.tenants(id) ON DELETE CASCADE,
        plan_id                 BIGINT NOT NULL REFERENCES admin.subscription_plans(id) ON DELETE RESTRICT,
        status                  VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        current_period_start    TIMESTAMPTZ NOT NULL,
        current_period_end      TIMESTAMPTZ NOT NULL,
        cancel_at_period_end    BOOLEAN NOT NULL DEFAULT false,
        canceled_at             TIMESTAMPTZ,
        trial_start             TIMESTAMPTZ,
        trial_end               TIMESTAMPTZ,
        grace_period_end        TIMESTAMPTZ,
        amount                  DECIMAL(15,2) NOT NULL,
        currency                VARCHAR(8) NOT NULL DEFAULT 'USD',
        billing_cycle           VARCHAR(32) NOT NULL DEFAULT 'MONTHLY',
        payment_method_id       VARCHAR(255),
        payment_gateway         VARCHAR(64),
        payment_gateway_subscription_id VARCHAR(255),
        metadata                JSONB,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by              BIGINT,
        updated_by              BIGINT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id 
      ON admin.subscriptions (tenant_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id 
      ON admin.subscriptions (plan_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
      ON admin.subscriptions (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end 
      ON admin.subscriptions (current_period_end)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_period 
      ON admin.subscriptions (grace_period_end) WHERE grace_period_end IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_gateway_id 
      ON admin.subscriptions (payment_gateway_subscription_id) 
      WHERE payment_gateway_subscription_id IS NOT NULL
    `);

    // Subscription History - Track subscription changes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin.subscription_history (
        id                      BIGSERIAL PRIMARY KEY,
        subscription_id         BIGINT NOT NULL REFERENCES admin.subscriptions(id) ON DELETE CASCADE,
        event_type              VARCHAR(64) NOT NULL,
        previous_status         VARCHAR(32),
        new_status              VARCHAR(32),
        previous_plan_id        BIGINT REFERENCES admin.subscription_plans(id),
        new_plan_id             BIGINT REFERENCES admin.subscription_plans(id),
        changed_by              BIGINT,
        reason                  TEXT,
        metadata                JSONB,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription 
      ON admin.subscription_history (subscription_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscription_history_event_type 
      ON admin.subscription_history (event_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_subscription_history_created 
      ON admin.subscription_history (created_at)
    `);

    // Add comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE admin.subscription_plans IS 'Available subscription plans with features and pricing'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE admin.subscriptions IS 'Tenant subscriptions with billing cycle and payment information'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE admin.subscription_history IS 'Audit trail of subscription changes and events'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN admin.subscriptions.status IS 'ACTIVE, TRIAL, PAST_DUE, CANCELED, EXPIRED, SUSPENDED'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN admin.subscription_plans.billing_cycle IS 'MONTHLY, QUARTERLY, YEARLY'
    `);

    // Seed default subscription plans: Basic, Pro, Enterprise
    await queryRunner.query(`
      INSERT INTO admin.subscription_plans (
        plan_key,
        plan_name,
        description,
        price,
        currency,
        billing_cycle,
        billing_interval,
        max_users,
        max_organizations,
        max_storage_gb,
        features,
        is_active,
        is_default,
        sort_order
      ) VALUES
      (
        'basic',
        'Basic',
        'Essential HR management features for small teams',
        29.00,
        'USD',
        'MONTHLY',
        1,
        25,
        1,
        10,
        '{
          "advancedAnalytics": false,
          "customBranding": false,
          "apiAccess": false,
          "sso": false,
          "prioritySupport": false,
          "customIntegrations": false,
          "maxApiCallsPerMonth": 0,
          "maxWebhooks": 0,
          "maxCustomFields": 5,
          "maxReports": 10
        }'::jsonb,
        true,
        true,
        1
      ),
      (
        'pro',
        'Pro',
        'Advanced features for growing organizations with multiple teams',
        99.00,
        'USD',
        'MONTHLY',
        1,
        100,
        5,
        50,
        '{
          "advancedAnalytics": true,
          "customBranding": true,
          "apiAccess": true,
          "sso": false,
          "prioritySupport": false,
          "customIntegrations": true,
          "maxApiCallsPerMonth": 10000,
          "maxWebhooks": 20,
          "maxCustomFields": 20,
          "maxReports": 50
        }'::jsonb,
        true,
        false,
        2
      ),
      (
        'enterprise',
        'Enterprise',
        'Full-featured solution with unlimited users and premium support',
        299.00,
        'USD',
        'MONTHLY',
        1,
        NULL,
        NULL,
        NULL,
        '{
          "advancedAnalytics": true,
          "customBranding": true,
          "apiAccess": true,
          "sso": true,
          "prioritySupport": true,
          "customIntegrations": true,
          "maxApiCallsPerMonth": null,
          "maxWebhooks": null,
          "maxCustomFields": null,
          "maxReports": null
        }'::jsonb,
        true,
        false,
        3
      )
      ON CONFLICT (plan_key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign key constraints)
    await queryRunner.query(`DROP TABLE IF EXISTS admin.subscription_history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS admin.subscriptions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS admin.subscription_plans CASCADE`);
  }
}

