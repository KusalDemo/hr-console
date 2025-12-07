import { DataSource, DataSourceOptions } from 'typeorm';
import { execSync } from 'child_process';

/**
 * Test Database Utility
 * 
 * Provides utilities for managing test database connections and schemas
 * Supports schema-per-tenant isolation for multi-tenant testing
 */
export class TestDatabaseUtil {
  private static dataSource: DataSource | null = null;

  /**
   * Get test database configuration
   */
  static getTestDataSourceOptions(): DataSourceOptions {
    return {
      type: 'postgres',
      host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || process.env.DB_PORT || '5432', 10),
      username: process.env.TEST_DB_USERNAME || process.env.DB_USERNAME || 'postgres',
      password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
      database: process.env.TEST_DB_NAME || 'hr_console_test_db',
      schema: process.env.TEST_DB_SCHEMA || 'admin',
      synchronize: false, // Always use migrations
      logging: false, // Disable logging in tests
      dropSchema: false,
      migrationsRun: false,
    };
  }

  /**
   * Create a test DataSource
   */
  static async createTestDataSource(
    schema?: string,
    entities?: any[],
  ): Promise<DataSource> {
    const options = this.getTestDataSourceOptions();
    if (schema) {
      options.schema = schema;
    }
    if (entities) {
      options.entities = entities;
    }

    const dataSource = new DataSource(options);
    await dataSource.initialize();
    return dataSource;
  }

  /**
   * Create a test tenant schema
   */
  static async createTestTenantSchema(
    dataSource: DataSource,
    schemaName: string,
  ): Promise<void> {
    await dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}";`);
  }

  /**
   * Drop a test tenant schema
   */
  static async dropTestTenantSchema(
    dataSource: DataSource,
    schemaName: string,
  ): Promise<void> {
    await dataSource.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`);
  }

  /**
   * Clean all tables in a schema
   */
  static async cleanSchema(dataSource: DataSource, schemaName: string): Promise<void> {
    const tables = await dataSource.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = $1
    `, [schemaName]);

    if (tables.length === 0) {
      return;
    }

    // Disable foreign key checks temporarily
    await dataSource.query(`SET session_replication_role = 'replica';`);

    for (const table of tables) {
      await dataSource.query(`TRUNCATE TABLE "${schemaName}"."${table.tablename}" CASCADE;`);
    }

    // Re-enable foreign key checks
    await dataSource.query(`SET session_replication_role = 'origin';`);
  }

  /**
   * Run migrations in a schema
   */
  static async runMigrations(
    dataSource: DataSource,
    schemaName: string,
    migrationsPath?: string,
  ): Promise<void> {
    // Set search path to the schema
    await dataSource.query(`SET search_path TO "${schemaName}";`);
    
    // Run migrations if provided
    if (migrationsPath) {
      // This would typically use TypeORM's migration runner
      // For now, we'll assume migrations are run separately
    }
  }

  /**
   * Close a DataSource connection
   */
  static async closeDataSource(dataSource: DataSource): Promise<void> {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }

  /**
   * Generate a unique test schema name
   */
  static generateTestSchemaName(prefix: string = 'test'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }
}
