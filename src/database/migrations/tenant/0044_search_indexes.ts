import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Advanced Search & Filtering Migration
 *
 * This migration creates:
 * - search_vector columns for full-text search on major entity tables
 * - GIN indexes for fast full-text search
 * - Search configurations table (optional)
 *
 * Note: This migration is designed to be run in tenant schemas (t_{tenantKey})
 */
export class SearchIndexes0000000000044 implements MigrationInterface {
  name = 'SearchIndexes0000000000044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add search_vector column to employees table
    await queryRunner.query(`
      ALTER TABLE employees 
      ADD COLUMN IF NOT EXISTS search_vector tsvector
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_search_vector 
      ON employees USING GIN (search_vector)
    `);

    // Create trigger function to update search_vector on employees
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION employees_search_vector_update()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector := 
          to_tsvector('english',
            COALESCE(NEW.first_name, '') || ' ' ||
            COALESCE(NEW.last_name, '') || ' ' ||
            COALESCE(NEW.email, '') || ' ' ||
            COALESCE(NEW.job_title, '') || ' ' ||
            COALESCE(NEW.phone, '') || ' ' ||
            COALESCE(NEW.mobile, '')
          );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS employees_search_vector_trigger ON employees
    `);

    await queryRunner.query(`
      CREATE TRIGGER employees_search_vector_trigger
      BEFORE INSERT OR UPDATE ON employees
      FOR EACH ROW
      EXECUTE FUNCTION employees_search_vector_update()
    `);

    // Add search_vector column to projects table
    await queryRunner.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS search_vector tsvector
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_search_vector 
      ON projects USING GIN (search_vector)
    `);

    // Create trigger function to update search_vector on projects
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION projects_search_vector_update()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector := 
          to_tsvector('english',
            COALESCE(NEW.project_name, '') || ' ' ||
            COALESCE(NEW.description, '') || ' ' ||
            COALESCE(NEW.project_code, '')
          );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS projects_search_vector_trigger ON projects
    `);

    await queryRunner.query(`
      CREATE TRIGGER projects_search_vector_trigger
      BEFORE INSERT OR UPDATE ON projects
      FOR EACH ROW
      EXECUTE FUNCTION projects_search_vector_update()
    `);

    // Add search_vector column to tasks table
    await queryRunner.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS search_vector tsvector
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_search_vector 
      ON tasks USING GIN (search_vector)
    `);

    // Create trigger function to update search_vector on tasks
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION tasks_search_vector_update()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector := 
          to_tsvector('english',
            COALESCE(NEW.task_name, '') || ' ' ||
            COALESCE(NEW.description, '')
          );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS tasks_search_vector_trigger ON tasks
    `);

    await queryRunner.query(`
      CREATE TRIGGER tasks_search_vector_trigger
      BEFORE INSERT OR UPDATE ON tasks
      FOR EACH ROW
      EXECUTE FUNCTION tasks_search_vector_update()
    `);

    // Add search_vector column to contacts table
    await queryRunner.query(`
      ALTER TABLE contacts 
      ADD COLUMN IF NOT EXISTS search_vector tsvector
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_search_vector 
      ON contacts USING GIN (search_vector)
    `);

    // Create trigger function to update search_vector on contacts
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION contacts_search_vector_update()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector := 
          to_tsvector('english',
            COALESCE(NEW.first_name, '') || ' ' ||
            COALESCE(NEW.last_name, '') || ' ' ||
            COALESCE(NEW.email, '') || ' ' ||
            COALESCE(NEW.company_name, '') || ' ' ||
            COALESCE(NEW.phone, '')
          );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS contacts_search_vector_trigger ON contacts
    `);

    await queryRunner.query(`
      CREATE TRIGGER contacts_search_vector_trigger
      BEFORE INSERT OR UPDATE ON contacts
      FOR EACH ROW
      EXECUTE FUNCTION contacts_search_vector_update()
    `);

    // Add search_vector column to documents table
    await queryRunner.query(`
      ALTER TABLE documents 
      ADD COLUMN IF NOT EXISTS search_vector tsvector
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_search_vector 
      ON documents USING GIN (search_vector)
    `);

    // Create trigger function to update search_vector on documents
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION documents_search_vector_update()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector := 
          to_tsvector('english',
            COALESCE(NEW.document_name, '') || ' ' ||
            COALESCE(NEW.description, '') || ' ' ||
            COALESCE(NEW.content, '')
          );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS documents_search_vector_trigger ON documents
    `);

    await queryRunner.query(`
      CREATE TRIGGER documents_search_vector_trigger
      BEFORE INSERT OR UPDATE ON documents
      FOR EACH ROW
      EXECUTE FUNCTION documents_search_vector_update()
    `);

    // Initial index population
    await queryRunner.query(`
      UPDATE employees 
      SET search_vector = 
        to_tsvector('english',
          COALESCE(first_name, '') || ' ' ||
          COALESCE(last_name, '') || ' ' ||
          COALESCE(email, '') || ' ' ||
          COALESCE(job_title, '') || ' ' ||
          COALESCE(phone, '') || ' ' ||
          COALESCE(mobile, '')
        )
      WHERE search_vector IS NULL
    `);

    await queryRunner.query(`
      UPDATE projects 
      SET search_vector = 
        to_tsvector('english',
          COALESCE(project_name, '') || ' ' ||
          COALESCE(description, '') || ' ' ||
          COALESCE(project_code, '')
        )
      WHERE search_vector IS NULL
    `);

    await queryRunner.query(`
      UPDATE tasks 
      SET search_vector = 
        to_tsvector('english',
          COALESCE(task_name, '') || ' ' ||
          COALESCE(description, '')
        )
      WHERE search_vector IS NULL
    `);

    await queryRunner.query(`
      UPDATE contacts 
      SET search_vector = 
        to_tsvector('english',
          COALESCE(first_name, '') || ' ' ||
          COALESCE(last_name, '') || ' ' ||
          COALESCE(email, '') || ' ' ||
          COALESCE(company_name, '') || ' ' ||
          COALESCE(phone, '')
        )
      WHERE search_vector IS NULL
    `);

    await queryRunner.query(`
      UPDATE documents 
      SET search_vector = 
        to_tsvector('english',
          COALESCE(document_name, '') || ' ' ||
          COALESCE(description, '') || ' ' ||
          COALESCE(content, '')
        )
      WHERE search_vector IS NULL 
        AND document_status = 'PUBLISHED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS documents_search_vector_trigger ON documents
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS contacts_search_vector_trigger ON contacts
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS tasks_search_vector_trigger ON tasks
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS projects_search_vector_trigger ON projects
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS employees_search_vector_trigger ON employees
    `);

    // Drop functions
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS documents_search_vector_update()
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS contacts_search_vector_update()
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS tasks_search_vector_update()
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS projects_search_vector_update()
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS employees_search_vector_update()
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_documents_search_vector
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_contacts_search_vector
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_tasks_search_vector
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_projects_search_vector
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_employees_search_vector
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE documents DROP COLUMN IF EXISTS search_vector
    `);

    await queryRunner.query(`
      ALTER TABLE contacts DROP COLUMN IF EXISTS search_vector
    `);

    await queryRunner.query(`
      ALTER TABLE tasks DROP COLUMN IF EXISTS search_vector
    `);

    await queryRunner.query(`
      ALTER TABLE projects DROP COLUMN IF EXISTS search_vector
    `);

    await queryRunner.query(`
      ALTER TABLE employees DROP COLUMN IF EXISTS search_vector
    `);
  }
}
