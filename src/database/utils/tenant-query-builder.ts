import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { TenantContext } from '../../tenants/services/tenant-context.service';

/**
 * Tenant Query Builder Helper
 * 
 * Provides utilities for building tenant-scoped queries:
 * - Automatic schema prefixing for raw SQL queries
 * - Organization filtering helpers
 * - Common query patterns
 * 
 * This utility makes it easier to build queries that are automatically
 * scoped to the current tenant schema and organization context.
 */
export class TenantQueryBuilder {
  /**
   * Quote a PostgreSQL identifier to prevent SQL injection
   * @param identifier - The identifier to quote
   * @returns Quoted identifier
   */
  static quoteIdentifier(identifier: string): string {
    // Remove any quotes and wrap in double quotes
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Prefix a table name with schema name
   * @param schemaName - Schema name (e.g., 't_tenantkey' or 'admin')
   * @param tableName - Table name
   * @returns Fully qualified table name (schema.table)
   */
  static prefixTable(schemaName: string, tableName: string): string {
    return `${this.quoteIdentifier(schemaName)}.${this.quoteIdentifier(tableName)}`;
  }

  /**
   * Build a fully qualified table name from tenant context
   * @param context - Tenant context
   * @param tableName - Table name
   * @returns Fully qualified table name
   */
  static getQualifiedTableName(
    context: TenantContext | null,
    tableName: string,
  ): string {
    const schemaName = context?.schemaName || 'admin';
    return this.prefixTable(schemaName, tableName);
  }

  /**
   * Build a raw SQL query with schema-prefixed table names
   * @param context - Tenant context
   * @param baseQuery - Base SQL query with {tableName} placeholders
   * @param tableNames - Map of placeholder names to actual table names
   * @returns SQL query with schema-prefixed table names
   * 
   * @example
   * const query = TenantQueryBuilder.buildQuery(
   *   context,
   *   'SELECT * FROM {users} WHERE active = $1',
   *   { users: 'users' }
   * );
   * // Returns: SELECT * FROM "t_tenantkey"."users" WHERE active = $1
   */
  static buildQuery(
    context: TenantContext | null,
    baseQuery: string,
    tableNames: Record<string, string>,
  ): string {
    let query = baseQuery;
    const schemaName = context?.schemaName || 'admin';

    // Replace all table name placeholders with schema-prefixed names
    for (const [placeholder, tableName] of Object.entries(tableNames)) {
      const qualifiedName = this.prefixTable(schemaName, tableName);
      query = query.replace(
        new RegExp(`\\{${placeholder}\\}`, 'g'),
        qualifiedName,
      );
    }

    return query;
  }

  /**
   * Add organization filter to a query builder
   * Filters results to only include data from the specified organization(s)
   * 
   * @param queryBuilder - TypeORM SelectQueryBuilder
   * @param context - Tenant context
   * @param organizationId - Organization ID to filter by (optional)
   * @param organizationIds - Multiple organization IDs to filter by (optional)
   * @param tableAlias - Table alias for the main entity (default: 'entity')
   * @param organizationColumn - Column name for organization_id (default: 'organization_id')
   * @returns Query builder with organization filter applied
   * 
   * @example
   * const queryBuilder = repository.createQueryBuilder('user');
   * TenantQueryBuilder.filterByOrganization(
   *   queryBuilder,
   *   context,
   *   organizationId,
   *   'user',
   *   'organization_id'
   * );
   */
  static filterByOrganization<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    context: TenantContext | null,
    organizationId?: number | null,
    organizationIds?: number[] | null,
    tableAlias: string = 'entity',
    organizationColumn: string = 'organization_id',
  ): SelectQueryBuilder<T> {
    // If no organization context, return query builder as-is
    if (!organizationId && (!organizationIds || organizationIds.length === 0)) {
      return queryBuilder;
    }

    // Build organization filter
    if (organizationIds && organizationIds.length > 0) {
      // Filter by multiple organizations
      queryBuilder.andWhere(
        `${tableAlias}.${organizationColumn} IN (:...organizationIds)`,
        { organizationIds },
      );
    } else if (organizationId) {
      // Filter by single organization
      queryBuilder.andWhere(`${tableAlias}.${organizationColumn} = :organizationId`, {
        organizationId,
      });
    }

    return queryBuilder;
  }

  /**
   * Add organization membership filter to a query builder
   * Filters results based on user's organization memberships
   * 
   * @param queryBuilder - TypeORM SelectQueryBuilder
   * @param context - Tenant context
   * @param userId - User ID
   * @param tableAlias - Table alias for the main entity (default: 'entity')
   * @param organizationColumn - Column name for organization_id (default: 'organization_id')
   * @returns Query builder with organization membership filter applied
   * 
   * @example
   * const queryBuilder = repository.createQueryBuilder('employee');
   * TenantQueryBuilder.filterByUserOrganizations(
   *   queryBuilder,
   *   context,
   *   userId,
   *   'employee'
   * );
   */
  static filterByUserOrganizations<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    context: TenantContext | null,
    userId: number,
    tableAlias: string = 'entity',
    organizationColumn: string = 'organization_id',
  ): SelectQueryBuilder<T> {
    if (!context || context.isSuperAdmin) {
      // Super admin can see all data
      return queryBuilder;
    }

    const schemaName = context.schemaName;

    // Join with organization_memberships to filter by user's organizations
    queryBuilder
      .innerJoin(
        `${this.prefixTable(schemaName, 'organization_memberships')}`,
        'om',
        `om.organization_id = ${tableAlias}.${organizationColumn} AND om.user_id = :userId AND om.left_at IS NULL`,
        { userId },
      );

    return queryBuilder;
  }

  /**
   * Build a query that filters by tenant and optionally by organization
   * 
   * @param queryBuilder - TypeORM SelectQueryBuilder
   * @param context - Tenant context
   * @param options - Query options
   * @returns Query builder with tenant and organization filters applied
   */
  static applyTenantFilters<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    context: TenantContext | null,
    options: {
      organizationId?: number | null;
      organizationIds?: number[] | null;
      userId?: number | null;
      tableAlias?: string;
      organizationColumn?: string;
    } = {},
  ): SelectQueryBuilder<T> {
    const {
      organizationId,
      organizationIds,
      userId,
      tableAlias = 'entity',
      organizationColumn = 'organization_id',
    } = options;

    // If user ID is provided, filter by user's organizations
    if (userId) {
      return this.filterByUserOrganizations(
        queryBuilder,
        context,
        userId,
        tableAlias,
        organizationColumn,
      );
    }

    // Otherwise, filter by specific organization(s)
    if (organizationId || organizationIds) {
      return this.filterByOrganization(
        queryBuilder,
        context,
        organizationId,
        organizationIds,
        tableAlias,
        organizationColumn,
      );
    }

    return queryBuilder;
  }

  /**
   * Build a raw SQL query with organization filter
   * 
   * @param context - Tenant context
   * @param baseQuery - Base SQL query
   * @param tableNames - Map of placeholder names to actual table names
   * @param organizationId - Organization ID to filter by (optional)
   * @param organizationIds - Multiple organization IDs to filter by (optional)
   * @param organizationColumn - Column name for organization_id (default: 'organization_id')
   * @returns SQL query with organization filter
   */
  static buildQueryWithOrganizationFilter(
    context: TenantContext | null,
    baseQuery: string,
    tableNames: Record<string, string>,
    organizationId?: number | null,
    organizationIds?: number[] | null,
    organizationColumn: string = 'organization_id',
  ): { query: string; parameters: any[] } {
    let query = this.buildQuery(context, baseQuery, tableNames);
    const parameters: any[] = [];

    // Add organization filter if provided
    if (organizationIds && organizationIds.length > 0) {
      const placeholders = organizationIds.map((_, index) => `$${parameters.length + index + 1}`).join(', ');
      query += ` AND ${organizationColumn} IN (${placeholders})`;
      parameters.push(...organizationIds);
    } else if (organizationId) {
      query += ` AND ${organizationColumn} = $${parameters.length + 1}`;
      parameters.push(organizationId);
    }

    return { query, parameters };
  }

  /**
   * Build a count query with tenant and organization filters
   * 
   * @param context - Tenant context
   * @param tableName - Table name
   * @param organizationId - Organization ID to filter by (optional)
   * @param organizationIds - Multiple organization IDs to filter by (optional)
   * @param additionalConditions - Additional WHERE conditions (optional)
   * @param organizationColumn - Column name for organization_id (default: 'organization_id')
   * @returns SQL query and parameters
   */
  static buildCountQuery(
    context: TenantContext | null,
    tableName: string,
    organizationId?: number | null,
    organizationIds?: number[] | null,
    additionalConditions?: string,
    organizationColumn: string = 'organization_id',
  ): { query: string; parameters: any[] } {
    const schemaName = context?.schemaName || 'admin';
    const qualifiedTable = this.prefixTable(schemaName, tableName);

    let query = `SELECT COUNT(*) as count FROM ${qualifiedTable} WHERE 1=1`;
    const parameters: any[] = [];

    // Add organization filter
    if (organizationIds && organizationIds.length > 0) {
      const placeholders = organizationIds.map((_, index) => `$${parameters.length + index + 1}`).join(', ');
      query += ` AND ${organizationColumn} IN (${placeholders})`;
      parameters.push(...organizationIds);
    } else if (organizationId) {
      query += ` AND ${organizationColumn} = $${parameters.length + 1}`;
      parameters.push(organizationId);
    }

    // Add additional conditions
    if (additionalConditions) {
      query += ` AND ${additionalConditions}`;
    }

    return { query, parameters };
  }

  /**
   * Build a paginated query with tenant and organization filters
   * 
   * @param context - Tenant context
   * @param tableName - Table name
   * @param options - Query options
   * @returns SQL query and parameters
   */
  static buildPaginatedQuery(
    context: TenantContext | null,
    tableName: string,
    options: {
      page?: number;
      limit?: number;
      organizationId?: number | null;
      organizationIds?: number[] | null;
      orderBy?: string;
      orderDirection?: 'ASC' | 'DESC';
      additionalConditions?: string;
      organizationColumn?: string;
    } = {},
  ): { query: string; countQuery: string; parameters: any[]; countParameters: any[] } {
    const {
      page = 1,
      limit = 10,
      organizationId,
      organizationIds,
      orderBy = 'id',
      orderDirection = 'ASC',
      additionalConditions,
      organizationColumn = 'organization_id',
    } = options;

    const schemaName = context?.schemaName || 'admin';
    const qualifiedTable = this.prefixTable(schemaName, tableName);
    const offset = (page - 1) * limit;

    // Build count query
    const countResult = this.buildCountQuery(
      context,
      tableName,
      organizationId,
      organizationIds,
      additionalConditions,
      organizationColumn,
    );

    // Build data query
    let query = `SELECT * FROM ${qualifiedTable} WHERE 1=1`;
    const parameters: any[] = [];

    // Add organization filter
    if (organizationIds && organizationIds.length > 0) {
      const placeholders = organizationIds.map((_, index) => `$${parameters.length + index + 1}`).join(', ');
      query += ` AND ${organizationColumn} IN (${placeholders})`;
      parameters.push(...organizationIds);
    } else if (organizationId) {
      query += ` AND ${organizationColumn} = $${parameters.length + 1}`;
      parameters.push(organizationId);
    }

    // Add additional conditions
    if (additionalConditions) {
      query += ` AND ${additionalConditions}`;
    }

    // Add ordering
    query += ` ORDER BY ${this.quoteIdentifier(orderBy)} ${orderDirection}`;

    // Add pagination
    query += ` LIMIT $${parameters.length + 1} OFFSET $${parameters.length + 2}`;
    parameters.push(limit, offset);

    return {
      query,
      countQuery: countResult.query,
      parameters,
      countParameters: countResult.parameters,
    };
  }
}

