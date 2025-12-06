import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { MultiTenantService } from '../../database/multi-tenant.service';
import { TenantRepository } from '../../admin/repositories/tenant.repository';
import { Tenant } from '../../admin/entities/tenant.entity';
import { TenantBaseline0000000000001 } from '../../database/migrations/tenant/0001_baseline';

/**
 * Tenant Provisioning Service
 * 
 * Handles the complete tenant provisioning process:
 * 1. Create tenant schema (t_{tenantKey})
 * 2. Run tenant migrations
 * 3. Create tenant record in admin schema
 * 4. Initialize default data (delegated to TenantInitializationService)
 * 
 * This service should be called by super admin when creating a new tenant.
 */
@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly multiTenantService: MultiTenantService,
    private readonly tenantRepository: TenantRepository,
  ) {}

  /**
   * Provision a new tenant
   * This is the main entry point for tenant provisioning
   * 
   * @param tenantKey - Unique tenant key (will be normalized to lowercase)
   * @param tenantName - Display name for the tenant
   * @returns Created tenant entity
   */
  async provisionTenant(
    tenantKey: string,
    tenantName: string,
  ): Promise<Tenant> {
    // Normalize tenant key
    const normalizedTenantKey = tenantKey.trim().toLowerCase();

    // Validate tenant key format
    this.validateTenantKey(normalizedTenantKey);

    // Check if tenant already exists
    const existingTenant = await this.tenantRepository.findByTenantKey(
      normalizedTenantKey,
      true, // Include inactive
    );

    if (existingTenant) {
      this.logger.error(`Tenant already exists: ${normalizedTenantKey}`);
      throw new ConflictException(
        `Tenant with key '${normalizedTenantKey}' already exists`,
      );
    }

    // Get schema name
    const schemaName = this.multiTenantService.getTenantSchemaName(
      normalizedTenantKey,
    );

    // Check if schema already exists
    const schemaExists = await this.multiTenantService.schemaExists(schemaName);
    if (schemaExists) {
      this.logger.error(`Schema already exists: ${schemaName}`);
      throw new ConflictException(
        `Schema '${schemaName}' already exists. Tenant may have been partially provisioned.`,
      );
    }

    this.logger.log(
      `Starting tenant provisioning: ${normalizedTenantKey} (schema: ${schemaName})`,
    );

    try {
      // Step 1: Create tenant schema
      await this.createTenantSchema(schemaName);

      // Step 2: Run tenant migrations
      await this.runTenantMigrations(schemaName);

      // Step 3: Create tenant record in admin schema
      const tenant = await this.createTenantRecord(
        normalizedTenantKey,
        tenantName,
      );

      this.logger.log(
        `Successfully provisioned tenant: ${normalizedTenantKey} (ID: ${tenant.id})`,
      );

      return tenant;
    } catch (error) {
      this.logger.error(
        `Failed to provision tenant: ${normalizedTenantKey}`,
        error,
      );

      // Attempt cleanup on failure
      await this.cleanupFailedProvisioning(schemaName, normalizedTenantKey);

      throw error;
    }
  }

  /**
   * Create tenant schema
   * @param schemaName - Schema name to create
   */
  private async createTenantSchema(schemaName: string): Promise<void> {
    this.logger.log(`Creating tenant schema: ${schemaName}`);
    await this.multiTenantService.createSchema(schemaName);
    this.logger.log(`Schema created: ${schemaName}`);
  }

  /**
   * Run tenant migrations in the tenant schema
   * @param schemaName - Schema name to run migrations in
   */
  private async runTenantMigrations(schemaName: string): Promise<void> {
    this.logger.log(`Running tenant migrations for schema: ${schemaName}`);

    // Create a query runner for the tenant schema
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Set search path to the tenant schema
      await queryRunner.query(
        `SET search_path TO ${this.quoteIdentifier(schemaName)}`,
      );

      // Create migrations table in the tenant schema if it doesn't exist
      await this.createMigrationsTable(queryRunner, schemaName);

      // Run the baseline migration
      const baselineMigration = new TenantBaseline0000000000001();
      await baselineMigration.up(queryRunner);

      // Record the migration in the migrations table
      await this.recordMigration(
        queryRunner,
        schemaName,
        baselineMigration.name,
      );

      this.logger.log(
        `Successfully ran tenant migrations for schema: ${schemaName}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Create migrations table in tenant schema
   * @param queryRunner - Query runner for the tenant schema
   * @param schemaName - Schema name
   */
  private async createMigrationsTable(
    queryRunner: QueryRunner,
    schemaName: string,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${this.quoteIdentifier(schemaName)}.migrations (
        id SERIAL PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        name VARCHAR(255) NOT NULL,
        UNIQUE(timestamp, name)
      )
    `);
  }

  /**
   * Record migration in migrations table
   * @param queryRunner - Query runner for the tenant schema
   * @param schemaName - Schema name
   * @param migrationName - Migration name
   */
  private async recordMigration(
    queryRunner: QueryRunner,
    schemaName: string,
    migrationName: string,
  ): Promise<void> {
    // Extract timestamp from migration name (format: MigrationName0000000000001)
    const timestampMatch = migrationName.match(/(\d+)$/);
    const timestamp = timestampMatch
      ? parseInt(timestampMatch[1], 10)
      : Date.now();

    await queryRunner.query(
      `
      INSERT INTO ${this.quoteIdentifier(schemaName)}.migrations (timestamp, name)
      VALUES ($1, $2)
      ON CONFLICT (timestamp, name) DO NOTHING
    `,
      [timestamp, migrationName],
    );
  }

  /**
   * Create tenant record in admin schema
   * @param tenantKey - Tenant key
   * @param tenantName - Tenant name
   * @returns Created tenant entity
   */
  private async createTenantRecord(
    tenantKey: string,
    tenantName: string,
  ): Promise<Tenant> {
    this.logger.log(`Creating tenant record: ${tenantKey}`);

    const tenant = this.tenantRepository.create({
      tenantKey,
      name: tenantName.trim(),
      isActive: true,
    });

    const savedTenant = await this.tenantRepository.save(tenant);
    this.logger.log(`Tenant record created: ${tenantKey} (ID: ${savedTenant.id})`);

    return savedTenant;
  }

  /**
   * Validate tenant key format
   * @param tenantKey - Tenant key to validate
   */
  private validateTenantKey(tenantKey: string): void {
    if (!tenantKey || tenantKey.length === 0) {
      throw new BadRequestException('Tenant key is required');
    }

    if (tenantKey.length > 64) {
      throw new BadRequestException(
        'Tenant key must be 64 characters or less',
      );
    }

    // Allow alphanumeric, hyphens, and underscores
    if (!/^[a-z0-9_-]+$/.test(tenantKey)) {
      throw new BadRequestException(
        'Tenant key can only contain lowercase letters, numbers, hyphens, and underscores',
      );
    }

    // Reserved keys
    const reservedKeys = ['admin', 'public', 'postgres', 'information_schema'];
    if (reservedKeys.includes(tenantKey)) {
      throw new BadRequestException(
        `Tenant key '${tenantKey}' is reserved and cannot be used`,
      );
    }
  }

  /**
   * Cleanup failed provisioning
   * Attempts to remove schema and tenant record if provisioning failed
   * @param schemaName - Schema name to cleanup
   * @param tenantKey - Tenant key to cleanup
   */
  private async cleanupFailedProvisioning(
    schemaName: string,
    tenantKey: string,
  ): Promise<void> {
    this.logger.warn(
      `Cleaning up failed provisioning: ${schemaName} (tenant: ${tenantKey})`,
    );

    try {
      // Try to drop schema
      const schemaExists = await this.multiTenantService.schemaExists(schemaName);
      if (schemaExists) {
        await this.dataSource.query(`DROP SCHEMA IF EXISTS ${this.quoteIdentifier(schemaName)} CASCADE`);
        this.logger.log(`Dropped schema: ${schemaName}`);
      }

      // Try to remove tenant record
      const tenant = await this.tenantRepository.findByTenantKey(tenantKey, true);
      if (tenant) {
        await this.tenantRepository.remove(tenant);
        this.logger.log(`Removed tenant record: ${tenantKey}`);
      }
    } catch (error) {
      this.logger.error(
        `Error during cleanup of failed provisioning: ${schemaName}`,
        error,
      );
      // Don't throw - cleanup errors should not mask the original error
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

  /**
   * Check if tenant is provisioned
   * @param tenantKey - Tenant key to check
   * @returns True if tenant is fully provisioned, false otherwise
   */
  async isTenantProvisioned(tenantKey: string): Promise<boolean> {
    const normalizedTenantKey = tenantKey.trim().toLowerCase();
    const schemaName = this.multiTenantService.getTenantSchemaName(
      normalizedTenantKey,
    );

    // Check if tenant record exists
    const tenant = await this.tenantRepository.findByTenantKey(
      normalizedTenantKey,
      true,
    );
    if (!tenant) {
      return false;
    }

    // Check if schema exists
    const schemaExists = await this.multiTenantService.schemaExists(schemaName);
    if (!schemaExists) {
      return false;
    }

    // Check if required tables exist
    const requiredTables = ['users', 'roles', 'organizations'];
    const hasRequiredTables = await this.multiTenantService.validateSchemaTables(
      schemaName,
      requiredTables,
    );

    return hasRequiredTables;
  }
}

