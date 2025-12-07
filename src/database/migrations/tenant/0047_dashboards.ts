import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dashboard Builder Framework Migration
 *
 * This migration creates:
 * - dashboards table for configurable dashboards
 * - dashboard_widgets table for reusable widget definitions
 * - Indexes for performance
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class Dashboards0000000000047 implements MigrationInterface {
  name = 'Dashboards0000000000047';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create dashboards table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dashboards (
        id BIGSERIAL PRIMARY KEY,
        dashboard_name VARCHAR(255) NOT NULL,
        dashboard_description TEXT,
        organization_id BIGINT NOT NULL,
        dashboard_type VARCHAR(32) NOT NULL DEFAULT 'PERSONAL',
        owner_id BIGINT,
        department_id BIGINT,
        team_id BIGINT,
        layout_type VARCHAR(32) NOT NULL DEFAULT 'GRID',
        layout_config JSONB,
        widget_configs JSONB,
        is_shared BOOLEAN NOT NULL DEFAULT false,
        is_template BOOLEAN NOT NULL DEFAULT false,
        template_id BIGINT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        category VARCHAR(128),
        tags JSONB,
        sharing_config JSONB,
        dashboard_metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by BIGINT,
        updated_by BIGINT,
        CONSTRAINT fk_dashboards_organization
          FOREIGN KEY (organization_id)
          REFERENCES organizations(id)
          ON DELETE CASCADE
      )
    `);

    // Create dashboard_widgets table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS dashboard_widgets (
        id BIGSERIAL PRIMARY KEY,
        dashboard_id BIGINT NOT NULL,
        widget_name VARCHAR(255) NOT NULL,
        widget_description TEXT,
        widget_type VARCHAR(32) NOT NULL,
        chart_type VARCHAR(32),
        data_source_type VARCHAR(32) NOT NULL DEFAULT 'DATABASE',
        kpi_definition_id BIGINT,
        data_source_config JSONB,
        position JSONB,
        size JSONB,
        widget_settings JSONB,
        widget_filters JSONB,
        refresh_interval INTEGER NOT NULL DEFAULT 0,
        widget_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_visible BOOLEAN NOT NULL DEFAULT true,
        widget_metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by BIGINT,
        updated_by BIGINT,
        CONSTRAINT fk_dashboard_widgets_dashboard
          FOREIGN KEY (dashboard_id)
          REFERENCES dashboards(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_dashboard_widgets_kpi
          FOREIGN KEY (kpi_definition_id)
          REFERENCES kpi_definitions(id)
          ON DELETE SET NULL
      )
    `);

    // Create indexes for dashboards
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboards_organization 
      ON dashboards (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboards_owner 
      ON dashboards (owner_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboards_type 
      ON dashboards (dashboard_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboards_shared 
      ON dashboards (is_shared)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboards_template 
      ON dashboards (is_template)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboards_active 
      ON dashboards (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboards_category 
      ON dashboards (category)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboards_org_type_active 
      ON dashboards (organization_id, dashboard_type, is_active)
    `);

    // Create indexes for dashboard_widgets
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard 
      ON dashboard_widgets (dashboard_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_type 
      ON dashboard_widgets (widget_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_kpi 
      ON dashboard_widgets (kpi_definition_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_active 
      ON dashboard_widgets (is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_visible 
      ON dashboard_widgets (is_visible)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_order 
      ON dashboard_widgets (dashboard_id, widget_order)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes for dashboard_widgets
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dashboard_widgets_order
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dashboard_widgets_visible
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dashboard_widgets_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dashboard_widgets_kpi
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dashboard_widgets_type
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dashboard_widgets_dashboard
    `);

    // Drop indexes for dashboards
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dashboards_org_type_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dashboards_category
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dashboards_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dashboards_template
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dashboards_shared
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dashboards_type
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dashboards_owner
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_dashboards_organization
    `);

    // Drop tables
    await queryRunner.query(`
      DROP TABLE IF EXISTS dashboard_widgets
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS dashboards
    `);
  }
}
