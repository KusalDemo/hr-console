import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Performance Reviews Migration
 *
 * This migration creates:
 * - performance_review_cycles table (review periods, templates)
 * - performance_reviews table (individual reviews with forms, ratings, feedback)
 * - performance_review_forms table (review forms with questions and responses)
 * - Indexes for performance optimization
 * - Foreign key relationships
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class PerformanceReviews0000000000026 implements MigrationInterface {
  name = 'PerformanceReviews0000000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Performance Review Cycles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS performance_review_cycles (
        id                          BIGSERIAL PRIMARY KEY,
        cycle_name                  VARCHAR(255) NOT NULL,
        cycle_description           TEXT,
        organization_id              BIGINT NOT NULL,
        department_id               BIGINT,
        period_start                DATE NOT NULL,
        period_end                  DATE NOT NULL,
        self_assessment_start       DATE,
        self_assessment_end         DATE,
        manager_review_start        DATE,
        manager_review_end          DATE,
        calibration_start           DATE,
        calibration_end             DATE,
        status                      VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        is_template                 BOOLEAN NOT NULL DEFAULT false,
        template_id                 BIGINT,
        cycle_metadata              JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_review_cycles_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for performance_review_cycles
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_review_cycles_organization 
      ON performance_review_cycles (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_review_cycles_status 
      ON performance_review_cycles (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_review_cycles_period 
      ON performance_review_cycles (period_start, period_end)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_review_cycles_active 
      ON performance_review_cycles (is_active)
    `);

    // Performance Reviews table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS performance_reviews (
        id                          BIGSERIAL PRIMARY KEY,
        review_cycle_id            BIGINT NOT NULL,
        employee_id                BIGINT NOT NULL,
        reviewer_id                BIGINT NOT NULL,
        organization_id              BIGINT NOT NULL,
        review_type                VARCHAR(32) NOT NULL DEFAULT 'ANNUAL',
        status                      VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED',
        overall_rating              VARCHAR(32),
        overall_score               DECIMAL(5,2),
        self_assessment_completed_at TIMESTAMPTZ,
        manager_review_completed_at TIMESTAMPTZ,
        review_completed_at         TIMESTAMPTZ,
        employee_acknowledged_at    TIMESTAMPTZ,
        improvement_plan            JSONB,
        review_metadata             JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_performance_reviews_cycle 
          FOREIGN KEY (review_cycle_id) 
          REFERENCES performance_review_cycles(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_performance_reviews_employee 
          FOREIGN KEY (employee_id) 
          REFERENCES employees(id) 
          ON DELETE CASCADE,
        CONSTRAINT fk_performance_reviews_reviewer 
          FOREIGN KEY (reviewer_id) 
          REFERENCES employees(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_performance_reviews_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for performance_reviews
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_reviews_cycle 
      ON performance_reviews (review_cycle_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee 
      ON performance_reviews (employee_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer 
      ON performance_reviews (reviewer_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_reviews_status 
      ON performance_reviews (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_reviews_organization 
      ON performance_reviews (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_reviews_type 
      ON performance_reviews (review_type)
    `);

    // Performance Review Forms table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS performance_review_forms (
        id                          BIGSERIAL PRIMARY KEY,
        performance_review_id        BIGINT NOT NULL,
        form_type                   VARCHAR(32) NOT NULL DEFAULT 'MANAGER_REVIEW',
        form_status                 VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
        reviewer_id                 BIGINT,
        form_title                  VARCHAR(255) NOT NULL,
        form_data                   JSONB NOT NULL,
        form_rating                 DECIMAL(5,2),
        overall_feedback            TEXT,
        strengths                   TEXT,
        areas_for_improvement        TEXT,
        submitted_at                TIMESTAMPTZ,
        form_metadata               JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_review_forms_review 
          FOREIGN KEY (performance_review_id) 
          REFERENCES performance_reviews(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for performance_review_forms
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_review_forms_review 
      ON performance_review_forms (performance_review_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_review_forms_type 
      ON performance_review_forms (form_type)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_review_forms_status 
      ON performance_review_forms (form_status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_review_forms_reviewer 
      ON performance_review_forms (reviewer_id)
    `);

    // Add comments to tables
    await queryRunner.query(`
      COMMENT ON TABLE performance_review_cycles IS 'Review cycles with periods, templates, and review management';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE performance_reviews IS 'Individual performance reviews with forms, ratings, feedback, and workflows';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE performance_review_forms IS 'Review forms with questions, ratings, and feedback';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN performance_review_cycles.status IS 'DRAFT, ACTIVE, IN_PROGRESS, CALIBRATION, COMPLETED, ARCHIVED';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN performance_reviews.review_type IS 'ANNUAL, MID_YEAR, QUARTERLY, PROJECT, PROBATION, PROMOTION, CUSTOM';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN performance_reviews.status IS 'NOT_STARTED, SELF_ASSESSMENT, MANAGER_REVIEW, PEER_REVIEW, CALIBRATION, COMPLETED, CANCELLED';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN performance_reviews.overall_rating IS 'EXCEEDS_EXPECTATIONS, MEETS_EXPECTATIONS, NEEDS_IMPROVEMENT, UNSATISFACTORY, NOT_RATED';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN performance_review_forms.form_type IS 'SELF_ASSESSMENT, MANAGER_REVIEW, PEER_REVIEW, CUSTOM';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN performance_review_forms.form_status IS 'DRAFT, IN_PROGRESS, SUBMITTED, COMPLETED';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_review_forms_reviewer
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_review_forms_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_review_forms_type
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_review_forms_review
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_performance_reviews_type
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_performance_reviews_organization
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_performance_reviews_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_performance_reviews_reviewer
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_performance_reviews_employee
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_performance_reviews_cycle
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_review_cycles_active
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_review_cycles_period
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_review_cycles_status
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_review_cycles_organization
    `);

    // Drop tables (forms first due to foreign key)
    await queryRunner.query(`
      DROP TABLE IF EXISTS performance_review_forms CASCADE
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS performance_reviews CASCADE
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS performance_review_cycles CASCADE
    `);
  }
}
