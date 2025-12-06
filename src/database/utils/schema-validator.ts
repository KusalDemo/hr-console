import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  isValid: boolean;
  schemaExists: boolean;
  hasRequiredTables: boolean;
  missingTables: string[];
  migrationStatus: MigrationStatus;
  errors: string[];
}

/**
 * Migration status
 */
export interface MigrationStatus {
  migrationsTableExists: boolean;
  appliedMigrations: string[];
  pendingMigrations: string[];
  lastMigrationTimestamp: number | null;
}

/**
 * Database Schema Validator
 * 
 * Provides utilities for validating database schemas:
 * - Validate schema exists
 * - Check schema has required tables
 * - Schema health check
 * - Migration status check
 */
@Injectable()
export class SchemaValidator {
  private readonly logger = new Logger(SchemaValidator.name);

  // Required tables for admin schema
  private readonly ADMIN_REQUIRED_TABLES = [
    'tenants',
    'super_admin',
    'tenant_admin',
    'subscription_plans',
    'subscriptions',
    'audit_logs',
  ];

  // Required tables for tenant schema (baseline)
  private readonly TENANT_REQUIRED_TABLES = [
    'users',
    'roles',
    'user_roles',
    'organizations',
    'organization_memberships',
  ];

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Validate schema exists
   * @param schemaName - Schema name to validate
   * @returns True if schema exists, false otherwise
   */
  async validateSchemaExists(schemaName: string): Promise<boolean> {
    try {
      const result = await this.dataSource.query(
        `SELECT schema_name 
         FROM information_schema.schemata 
         WHERE schema_name = $1`,
        [schemaName],
      );
      return result.length > 0;
    } catch (error) {
      this.logger.error(`Error validating schema existence: ${schemaName}`, error);
      return false;
    }
  }

  /**
   * Check if schema has required tables
   * @param schemaName - Schema name to check
   * @param requiredTables - Array of required table names
   * @returns Object with validation result and missing tables
   */
  async checkSchemaTables(
    schemaName: string,
    requiredTables: string[],
  ): Promise<{
    hasAllTables: boolean;
    existingTables: string[];
    missingTables: string[];
  }> {
    try {
      // Get all tables in the schema
      const result = await this.dataSource.query(
        `SELECT table_name 
         FROM information_schema.tables 
         WHERE table_schema = $1 
         AND table_type = 'BASE TABLE'`,
        [schemaName],
      );

      const existingTables = result.map((row: { table_name: string }) =>
        row.table_name.toLowerCase(),
      );
      const requiredTablesLower = requiredTables.map((t) => t.toLowerCase());

      const missingTables = requiredTablesLower.filter(
        (table) => !existingTables.includes(table),
      );

      return {
        hasAllTables: missingTables.length === 0,
        existingTables,
        missingTables,
      };
    } catch (error) {
      this.logger.error(
        `Error checking schema tables: ${schemaName}`,
        error,
      );
      return {
        hasAllTables: false,
        existingTables: [],
        missingTables: requiredTables,
      };
    }
  }

  /**
   * Validate admin schema
   * @returns Validation result
   */
  async validateAdminSchema(): Promise<SchemaValidationResult> {
    const schemaName = 'admin';
    const errors: string[] = [];

    // Check if schema exists
    const schemaExists = await this.validateSchemaExists(schemaName);
    if (!schemaExists) {
      errors.push(`Schema '${schemaName}' does not exist`);
      return {
        isValid: false,
        schemaExists: false,
        hasRequiredTables: false,
        missingTables: this.ADMIN_REQUIRED_TABLES,
        migrationStatus: {
          migrationsTableExists: false,
          appliedMigrations: [],
          pendingMigrations: [],
          lastMigrationTimestamp: null,
        },
        errors,
      };
    }

    // Check required tables
    const tablesCheck = await this.checkSchemaTables(
      schemaName,
      this.ADMIN_REQUIRED_TABLES,
    );

    if (!tablesCheck.hasAllTables) {
      errors.push(
        `Schema '${schemaName}' is missing required tables: ${tablesCheck.missingTables.join(', ')}`,
      );
    }

    // Check migration status
    const migrationStatus = await this.getMigrationStatus(schemaName);

    const isValid =
      schemaExists && tablesCheck.hasAllTables && migrationStatus.migrationsTableExists;

    return {
      isValid,
      schemaExists,
      hasRequiredTables: tablesCheck.hasAllTables,
      missingTables: tablesCheck.missingTables,
      migrationStatus,
      errors,
    };
  }

  /**
   * Validate tenant schema
   * @param schemaName - Tenant schema name (e.g., t_tenantkey)
   * @returns Validation result
   */
  async validateTenantSchema(schemaName: string): Promise<SchemaValidationResult> {
    const errors: string[] = [];

    // Check if schema exists
    const schemaExists = await this.validateSchemaExists(schemaName);
    if (!schemaExists) {
      errors.push(`Schema '${schemaName}' does not exist`);
      return {
        isValid: false,
        schemaExists: false,
        hasRequiredTables: false,
        missingTables: this.TENANT_REQUIRED_TABLES,
        migrationStatus: {
          migrationsTableExists: false,
          appliedMigrations: [],
          pendingMigrations: [],
          lastMigrationTimestamp: null,
        },
        errors,
      };
    }

    // Check required tables
    const tablesCheck = await this.checkSchemaTables(
      schemaName,
      this.TENANT_REQUIRED_TABLES,
    );

    if (!tablesCheck.hasAllTables) {
      errors.push(
        `Schema '${schemaName}' is missing required tables: ${tablesCheck.missingTables.join(', ')}`,
      );
    }

    // Check migration status
    const migrationStatus = await this.getMigrationStatus(schemaName);

    const isValid =
      schemaExists && tablesCheck.hasAllTables && migrationStatus.migrationsTableExists;

    return {
      isValid,
      schemaExists,
      hasRequiredTables: tablesCheck.hasAllTables,
      missingTables: tablesCheck.missingTables,
      migrationStatus,
      errors,
    };
  }

  /**
   * Get migration status for a schema
   * @param schemaName - Schema name
   * @returns Migration status
   */
  async getMigrationStatus(schemaName: string): Promise<MigrationStatus> {
    try {
      // Check if migrations table exists
      const migrationsTableExists = await this.checkTableExists(
        schemaName,
        'migrations',
      );

      if (!migrationsTableExists) {
        return {
          migrationsTableExists: false,
          appliedMigrations: [],
          pendingMigrations: [],
          lastMigrationTimestamp: null,
        };
      }

      // Get applied migrations
      const appliedMigrationsResult = await this.dataSource.query(
        `SELECT name, timestamp 
         FROM ${this.quoteIdentifier(schemaName)}.migrations 
         ORDER BY timestamp ASC`,
      );

      const appliedMigrations = appliedMigrationsResult.map(
        (row: { name: string }) => row.name,
      );

      const lastMigration = appliedMigrationsResult.length > 0
        ? appliedMigrationsResult[appliedMigrationsResult.length - 1]
        : null;

      // Note: Pending migrations would need to be determined by comparing
      // applied migrations with available migration files
      // For now, we'll return empty array
      const pendingMigrations: string[] = [];

      return {
        migrationsTableExists: true,
        appliedMigrations,
        pendingMigrations,
        lastMigrationTimestamp: lastMigration
          ? parseInt(lastMigration.timestamp, 10)
          : null,
      };
    } catch (error) {
      this.logger.error(
        `Error getting migration status for schema: ${schemaName}`,
        error,
      );
      return {
        migrationsTableExists: false,
        appliedMigrations: [],
        pendingMigrations: [],
        lastMigrationTimestamp: null,
      };
    }
  }

  /**
   * Check if a table exists in a schema
   * @param schemaName - Schema name
   * @param tableName - Table name
   * @returns True if table exists, false otherwise
   */
  async checkTableExists(schemaName: string, tableName: string): Promise<boolean> {
    try {
      const result = await this.dataSource.query(
        `SELECT table_name 
         FROM information_schema.tables 
         WHERE table_schema = $1 
         AND table_name = $2 
         AND table_type = 'BASE TABLE'`,
        [schemaName, tableName],
      );
      return result.length > 0;
    } catch (error) {
      this.logger.error(
        `Error checking table existence: ${schemaName}.${tableName}`,
        error,
      );
      return false;
    }
  }

  /**
   * Perform schema health check
   * Checks schema existence, required tables, and migration status
   * @param schemaName - Schema name
   * @param requiredTables - Required tables for the schema
   * @returns Health check result
   */
  async performHealthCheck(
    schemaName: string,
    requiredTables: string[],
  ): Promise<{
    healthy: boolean;
    schemaExists: boolean;
    hasRequiredTables: boolean;
    migrationStatusOk: boolean;
    details: SchemaValidationResult;
  }> {
    const validation = await this.validateTenantSchema(schemaName);

    // Override required tables if provided
    if (requiredTables.length > 0) {
      const tablesCheck = await this.checkSchemaTables(schemaName, requiredTables);
      validation.hasRequiredTables = tablesCheck.hasAllTables;
      validation.missingTables = tablesCheck.missingTables;
    }

    const healthy =
      validation.schemaExists &&
      validation.hasRequiredTables &&
      validation.migrationStatus.migrationsTableExists;

    return {
      healthy,
      schemaExists: validation.schemaExists,
      hasRequiredTables: validation.hasRequiredTables,
      migrationStatusOk: validation.migrationStatus.migrationsTableExists,
      details: validation,
    };
  }

  /**
   * Get all tables in a schema
   * @param schemaName - Schema name
   * @returns Array of table names
   */
  async getSchemaTables(schemaName: string): Promise<string[]> {
    try {
      const result = await this.dataSource.query(
        `SELECT table_name 
         FROM information_schema.tables 
         WHERE table_schema = $1 
         AND table_type = 'BASE TABLE'
         ORDER BY table_name`,
        [schemaName],
      );
      return result.map((row: { table_name: string }) => row.table_name);
    } catch (error) {
      this.logger.error(`Error getting schema tables: ${schemaName}`, error);
      return [];
    }
  }

  /**
   * Quote PostgreSQL identifier to prevent SQL injection
   * @param identifier - Identifier to quote
   * @returns Quoted identifier
   */
  private quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}

