import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import dataSource from '../data-source';

/**
 * Utility class for running migrations programmatically
 */
export class MigrationRunner {
  private static readonly logger = new Logger(MigrationRunner.name);

  /**
   * Run all pending migrations
   */
  static async runMigrations(): Promise<void> {
    try {
      if (!dataSource.isInitialized) {
        await dataSource.initialize();
      }

      this.logger.log('Running migrations...');
      const migrations = await dataSource.runMigrations();
      this.logger.log(`Successfully ran ${migrations.length} migration(s)`);

      migrations.forEach((migration) => {
        this.logger.log(`  - ${migration.name}`);
      });
    } catch (error) {
      this.logger.error('Error running migrations', error);
      throw error;
    } finally {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }
  }

  /**
   * Revert the last migration
   */
  static async revertLastMigration(): Promise<void> {
    try {
      if (!dataSource.isInitialized) {
        await dataSource.initialize();
      }

      this.logger.log('Reverting last migration...');
      await dataSource.undoLastMigration();
      this.logger.log('Successfully reverted last migration');
    } catch (error) {
      this.logger.error('Error reverting migration', error);
      throw error;
    } finally {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }
  }

  /**
   * Show migration status
   */
  static async showMigrations(): Promise<void> {
    try {
      if (!dataSource.isInitialized) {
        await dataSource.initialize();
      }

      const migrations = await dataSource.showMigrations();
      this.logger.log(
        `Migrations status: ${migrations ? 'Pending migrations exist' : 'No pending migrations'}`,
      );
    } catch (error) {
      this.logger.error('Error checking migration status', error);
      throw error;
    } finally {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }
  }

  /**
   * Run migrations for a specific schema
   * @param schemaName - The schema name to run migrations for
   */
  static async runMigrationsForSchema(schemaName: string): Promise<void> {
    try {
      if (!dataSource.isInitialized) {
        await dataSource.initialize();
      }

      // Set search path to the schema
      await dataSource.query(`SET search_path TO ${this.quoteIdentifier(schemaName)}`);

      this.logger.log(`Running migrations for schema: ${schemaName}`);
      const migrations = await dataSource.runMigrations();
      this.logger.log(
        `Successfully ran ${migrations.length} migration(s) for schema: ${schemaName}`,
      );
    } catch (error) {
      this.logger.error(`Error running migrations for schema: ${schemaName}`, error);
      throw error;
    } finally {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    }
  }

  private static quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}
