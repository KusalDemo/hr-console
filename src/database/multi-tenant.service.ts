import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

/**
 * Service for managing multi-tenant database operations
 * Handles schema switching and tenant context management
 */
@Injectable()
export class MultiTenantService {
  private readonly logger = new Logger(MultiTenantService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Get the schema name for a tenant
   * @param tenantKey - The tenant key
   * @returns Schema name in format t_{tenantKey}
   */
  getTenantSchemaName(tenantKey: string): string {
    return `t_${tenantKey.toLowerCase()}`;
  }

  /**
   * Get the admin schema name
   * @returns Admin schema name
   */
  getAdminSchemaName(): string {
    return 'admin';
  }

  /**
   * Check if a schema exists
   * @param schemaName - The schema name to check
   * @returns True if schema exists, false otherwise
   */
  async schemaExists(schemaName: string): Promise<boolean> {
    try {
      const result = await this.dataSource.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
        [schemaName],
      );
      return result.length > 0;
    } catch (error) {
      this.logger.error(`Error checking schema existence: ${schemaName}`, error);
      return false;
    }
  }

  /**
   * Create a new schema
   * @param schemaName - The schema name to create
   */
  async createSchema(schemaName: string): Promise<void> {
    try {
      await this.dataSource.query(`CREATE SCHEMA IF NOT EXISTS ${this.quoteIdentifier(schemaName)}`);
      this.logger.log(`Schema created: ${schemaName}`);
    } catch (error) {
      this.logger.error(`Error creating schema: ${schemaName}`, error);
      throw error;
    }
  }

  /**
   * Get an EntityManager for a specific schema
   * @param schemaName - The schema name
   * @returns EntityManager for the specified schema
   */
  async getEntityManagerForSchema(schemaName: string): Promise<EntityManager> {
    // Create a new query runner for the specific schema
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    // Set the search path to the tenant schema
    await queryRunner.query(`SET search_path TO ${this.quoteIdentifier(schemaName)}`);

    return queryRunner.manager;
  }

  /**
   * Execute a query in a specific schema context
   * @param schemaName - The schema name
   * @param query - The SQL query to execute
   * @param parameters - Query parameters
   * @returns Query result
   */
  async executeInSchema<T = unknown>(
    schemaName: string,
    query: string,
    parameters?: unknown[],
  ): Promise<T> {
    const manager = await this.getEntityManagerForSchema(schemaName);
    try {
      return (await manager.query(query, parameters)) as T;
    } finally {
      // Cleanup is handled by the query runner
    }
  }

  /**
   * Validate that a schema has required tables
   * @param schemaName - The schema name to validate
   * @param requiredTables - Array of required table names
   * @returns True if all required tables exist
   */
  async validateSchemaTables(schemaName: string, requiredTables: string[]): Promise<boolean> {
    try {
      const query = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_name = ANY($2::text[])
      `;
      const result = await this.dataSource.query(query, [schemaName, requiredTables]);
      return result.length === requiredTables.length;
    } catch (error) {
      this.logger.error(`Error validating schema tables: ${schemaName}`, error);
      return false;
    }
  }

  /**
   * Quote a PostgreSQL identifier to prevent SQL injection
   * @param identifier - The identifier to quote
   * @returns Quoted identifier
   */
  private quoteIdentifier(identifier: string): string {
    // Remove any quotes and wrap in double quotes
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Get database health status
   * @returns Health status object
   */
  async getHealthStatus(): Promise<{ status: string; message: string }> {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'healthy',
        message: 'Database connection is active',
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'unhealthy',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

