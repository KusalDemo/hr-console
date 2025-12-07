import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { Project } from '../../projects/entities/project.entity';
import { Task } from '../../tasks/entities/task.entity';
import { Contact } from '../../contacts/entities/contact.entity';
import { Document } from '../../documents/entities/document.entity';

/**
 * Search Index Service
 *
 * Manages search indexes:
 * - Creating/updating search vectors
 * - Index maintenance
 * - Index optimization
 */
@Injectable()
export class SearchIndexService {
  private readonly logger = new Logger(SearchIndexService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Update search index for all entities
   */
  async updateAllIndexes(): Promise<{ updated: number }> {
    let totalUpdated = 0;

    try {
      totalUpdated += await this.updateEmployeeIndexes();
    } catch (error) {
      this.logger.error(
        `Failed to update employee indexes: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    try {
      totalUpdated += await this.updateProjectIndexes();
    } catch (error) {
      this.logger.error(
        `Failed to update project indexes: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    try {
      totalUpdated += await this.updateTaskIndexes();
    } catch (error) {
      this.logger.error(
        `Failed to update task indexes: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    try {
      totalUpdated += await this.updateContactIndexes();
    } catch (error) {
      this.logger.error(
        `Failed to update contact indexes: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    try {
      totalUpdated += await this.updateDocumentIndexes();
    } catch (error) {
      this.logger.error(
        `Failed to update document indexes: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    this.logger.log(`Updated ${totalUpdated} search indexes`);
    return { updated: totalUpdated };
  }

  /**
   * Update employee search indexes
   */
  private async updateEmployeeIndexes(): Promise<number> {
    const result = await this.dataSource.query(`
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
         OR search_vector != to_tsvector('english',
            COALESCE(first_name, '') || ' ' ||
            COALESCE(last_name, '') || ' ' ||
            COALESCE(email, '') || ' ' ||
            COALESCE(job_title, '') || ' ' ||
            COALESCE(phone, '') || ' ' ||
            COALESCE(mobile, '')
          )
    `);

    return result[1] || 0;
  }

  /**
   * Update project search indexes
   */
  private async updateProjectIndexes(): Promise<number> {
    const result = await this.dataSource.query(`
      UPDATE projects
      SET search_vector = 
        to_tsvector('english',
          COALESCE(project_name, '') || ' ' ||
          COALESCE(description, '') || ' ' ||
          COALESCE(project_code, '')
        )
      WHERE search_vector IS NULL 
         OR search_vector != to_tsvector('english',
            COALESCE(project_name, '') || ' ' ||
            COALESCE(description, '') || ' ' ||
            COALESCE(project_code, '')
          )
    `);

    return result[1] || 0;
  }

  /**
   * Update task search indexes
   */
  private async updateTaskIndexes(): Promise<number> {
    const result = await this.dataSource.query(`
      UPDATE tasks
      SET search_vector = 
        to_tsvector('english',
          COALESCE(task_name, '') || ' ' ||
          COALESCE(description, '')
        )
      WHERE search_vector IS NULL 
         OR search_vector != to_tsvector('english',
            COALESCE(task_name, '') || ' ' ||
            COALESCE(description, '')
          )
    `);

    return result[1] || 0;
  }

  /**
   * Update contact search indexes
   */
  private async updateContactIndexes(): Promise<number> {
    const result = await this.dataSource.query(`
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
         OR search_vector != to_tsvector('english',
            COALESCE(first_name, '') || ' ' ||
            COALESCE(last_name, '') || ' ' ||
            COALESCE(email, '') || ' ' ||
            COALESCE(company_name, '') || ' ' ||
            COALESCE(phone, '')
          )
    `);

    return result[1] || 0;
  }

  /**
   * Update document search indexes
   */
  private async updateDocumentIndexes(): Promise<number> {
    const result = await this.dataSource.query(`
      UPDATE documents
      SET search_vector = 
        to_tsvector('english',
          COALESCE(document_name, '') || ' ' ||
          COALESCE(description, '') || ' ' ||
          COALESCE(content, '')
        )
      WHERE document_status = 'PUBLISHED'
        AND (search_vector IS NULL 
         OR search_vector != to_tsvector('english',
            COALESCE(document_name, '') || ' ' ||
            COALESCE(description, '') || ' ' ||
            COALESCE(content, '')
          ))
    `);

    return result[1] || 0;
  }

  /**
   * Rebuild all indexes (drop and recreate)
   */
  async rebuildAllIndexes(): Promise<void> {
    this.logger.log('Rebuilding all search indexes...');

    // Update all indexes
    await this.updateAllIndexes();

    // Analyze tables for query optimization
    await this.dataSource.query('ANALYZE employees');
    await this.dataSource.query('ANALYZE projects');
    await this.dataSource.query('ANALYZE tasks');
    await this.dataSource.query('ANALYZE contacts');
    await this.dataSource.query('ANALYZE documents');

    this.logger.log('Search indexes rebuilt successfully');
  }
}
