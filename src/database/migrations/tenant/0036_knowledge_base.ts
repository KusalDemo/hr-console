import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Knowledge Base System Migration
 * 
 * This migration creates:
 * - knowledge_categories table (hierarchical categories for organizing articles)
 * - knowledge_articles table (articles with versioning, workflow, permissions)
 * - knowledge_article_versions table (version history)
 * - knowledge_article_attachments table (file attachments)
 * - knowledge_article_views table (view tracking for analytics)
 * - knowledge_article_feedback table (user feedback and votes)
 * - Full-text search indexes
 * 
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class KnowledgeBase0000000000036 implements MigrationInterface {
  name = 'KnowledgeBase0000000000036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Knowledge Categories table - Hierarchical categories for organizing articles
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS knowledge_categories (
        id                          BIGSERIAL PRIMARY KEY,
        name                        VARCHAR(255) NOT NULL,
        slug                        VARCHAR(255) NOT NULL,
        description                 TEXT,
        parent_id                   BIGINT,
        organization_id             BIGINT,
        display_order               INTEGER NOT NULL DEFAULT 0,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        icon                        VARCHAR(512),
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_knowledge_categories_parent 
          FOREIGN KEY (parent_id) 
          REFERENCES knowledge_categories(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_knowledge_categories_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for knowledge_categories
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_categories_parent 
      ON knowledge_categories (parent_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_categories_organization 
      ON knowledge_categories (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_categories_slug 
      ON knowledge_categories (slug)
    `);

    // Knowledge Articles table - Articles with versioning, workflow, and permissions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS knowledge_articles (
        id                          BIGSERIAL PRIMARY KEY,
        title                       VARCHAR(255) NOT NULL,
        slug                        VARCHAR(255) NOT NULL UNIQUE,
        content                     TEXT NOT NULL,
        excerpt                     TEXT,
        status                      VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
        category_id                 BIGINT,
        organization_id             BIGINT,
        tags                        JSONB,
        current_version             INTEGER NOT NULL DEFAULT 1,
        view_count                  INTEGER NOT NULL DEFAULT 0,
        helpful_count               INTEGER NOT NULL DEFAULT 0,
        not_helpful_count           INTEGER NOT NULL DEFAULT 0,
        published_at                TIMESTAMPTZ,
        published_by                BIGINT,
        approved_at                 TIMESTAMPTZ,
        approved_by                 BIGINT,
        permissions                 JSONB,
        is_featured                 BOOLEAN NOT NULL DEFAULT false,
        allows_feedback             BOOLEAN NOT NULL DEFAULT true,
        seo_metadata                JSONB,
        metadata                    JSONB,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        updated_by                  BIGINT,
        CONSTRAINT fk_knowledge_articles_category 
          FOREIGN KEY (category_id) 
          REFERENCES knowledge_categories(id) 
          ON DELETE SET NULL,
        CONSTRAINT fk_knowledge_articles_organization 
          FOREIGN KEY (organization_id) 
          REFERENCES organizations(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for knowledge_articles
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_articles_status 
      ON knowledge_articles (status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_articles_category 
      ON knowledge_articles (category_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_articles_organization 
      ON knowledge_articles (organization_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_articles_slug 
      ON knowledge_articles (slug)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_articles_created 
      ON knowledge_articles (created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_articles_published 
      ON knowledge_articles (status, published_at DESC)
    `);

    // Full-text search index for articles
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_articles_fts 
      ON knowledge_articles 
      USING GIN (to_tsvector('english', title || ' ' || COALESCE(excerpt, '') || ' ' || content))
    `);

    // Knowledge Article Versions table - Version history
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS knowledge_article_versions (
        id                          BIGSERIAL PRIMARY KEY,
        article_id                  BIGINT NOT NULL,
        version_number              INTEGER NOT NULL,
        title                       VARCHAR(255) NOT NULL,
        content                     TEXT NOT NULL,
        excerpt                     TEXT,
        change_summary              TEXT,
        is_current                  BOOLEAN NOT NULL DEFAULT false,
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by                  BIGINT,
        CONSTRAINT fk_knowledge_article_versions_article 
          FOREIGN KEY (article_id) 
          REFERENCES knowledge_articles(id) 
          ON DELETE CASCADE,
        CONSTRAINT uq_knowledge_article_versions_article_version 
          UNIQUE (article_id, version_number)
      )
    `);

    // Create indexes for knowledge_article_versions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_article_versions_article 
      ON knowledge_article_versions (article_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_article_versions_version 
      ON knowledge_article_versions (article_id, version_number)
    `);

    // Knowledge Article Attachments table - File attachments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS knowledge_article_attachments (
        id                          BIGSERIAL PRIMARY KEY,
        article_id                  BIGINT NOT NULL,
        attachment_name             VARCHAR(255) NOT NULL,
        attachment_type             VARCHAR(64),
        file_path                   VARCHAR(512) NOT NULL,
        file_size                   BIGINT,
        file_hash                   VARCHAR(64),
        display_order               INTEGER NOT NULL DEFAULT 0,
        is_active                   BOOLEAN NOT NULL DEFAULT true,
        uploaded_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
        uploaded_by                 BIGINT,
        CONSTRAINT fk_knowledge_article_attachments_article 
          FOREIGN KEY (article_id) 
          REFERENCES knowledge_articles(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for knowledge_article_attachments
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_article_attachments_article 
      ON knowledge_article_attachments (article_id)
    `);

    // Knowledge Article Views table - View tracking for analytics
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS knowledge_article_views (
        id                          BIGSERIAL PRIMARY KEY,
        article_id                  BIGINT NOT NULL,
        user_id                     BIGINT,
        ip_address                  VARCHAR(45),
        user_agent                  VARCHAR(512),
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_knowledge_article_views_article 
          FOREIGN KEY (article_id) 
          REFERENCES knowledge_articles(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for knowledge_article_views
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_article_views_article 
      ON knowledge_article_views (article_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_article_views_user 
      ON knowledge_article_views (user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_article_views_created 
      ON knowledge_article_views (created_at DESC)
    `);

    // Knowledge Article Feedback table - User feedback and votes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS knowledge_article_feedback (
        id                          BIGSERIAL PRIMARY KEY,
        article_id                  BIGINT NOT NULL,
        user_id                     BIGINT,
        feedback_type               VARCHAR(32) NOT NULL,
        comment                     TEXT,
        ip_address                  VARCHAR(45),
        created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT fk_knowledge_article_feedback_article 
          FOREIGN KEY (article_id) 
          REFERENCES knowledge_articles(id) 
          ON DELETE CASCADE
      )
    `);

    // Create indexes for knowledge_article_feedback
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_article_feedback_article 
      ON knowledge_article_feedback (article_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_article_feedback_user 
      ON knowledge_article_feedback (user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_article_feedback_type 
      ON knowledge_article_feedback (feedback_type)
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE knowledge_categories IS 'Hierarchical categories for organizing knowledge articles';
      COMMENT ON COLUMN knowledge_categories.parent_id IS 'Parent category for hierarchical structure';
      COMMENT ON COLUMN knowledge_categories.slug IS 'URL-friendly slug for category';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE knowledge_articles IS 'Knowledge base articles with versioning, draft/published workflow, approval process, full-text search, permissions, and analytics';
      COMMENT ON COLUMN knowledge_articles.status IS 'Article status: DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, ARCHIVED, REJECTED';
      COMMENT ON COLUMN knowledge_articles.slug IS 'URL-friendly slug (unique)';
      COMMENT ON COLUMN knowledge_articles.tags IS 'JSON array: Tags for categorization';
      COMMENT ON COLUMN knowledge_articles.permissions IS 'JSON: Article permissions { view: [roles], edit: [roles], publish: [roles] }';
      COMMENT ON COLUMN knowledge_articles.seo_metadata IS 'JSON: SEO metadata (meta description, keywords, etc.)';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE knowledge_article_versions IS 'Version history for knowledge articles';
      COMMENT ON COLUMN knowledge_article_versions.is_current IS 'Whether this is the current version';
      COMMENT ON COLUMN knowledge_article_versions.change_summary IS 'Summary of changes in this version';
    `);

    await queryRunner.query(`
      COMMENT ON TABLE knowledge_article_views IS 'View tracking for article analytics';
      COMMENT ON TABLE knowledge_article_attachments IS 'File attachments for knowledge articles';
      COMMENT ON TABLE knowledge_article_feedback IS 'User feedback on articles (helpful votes, comments)';
      COMMENT ON COLUMN knowledge_article_feedback.feedback_type IS 'Feedback type: HELPFUL, NOT_HELPFUL, COMMENT';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (due to foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS knowledge_article_feedback CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS knowledge_article_views CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS knowledge_article_attachments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS knowledge_article_versions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS knowledge_articles CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS knowledge_categories CASCADE`);
  }
}
