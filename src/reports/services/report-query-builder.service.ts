import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { ReportDefinition } from '../entities/report-definition.entity';

/**
 * Report Query Builder Service
 * 
 * Builds dynamic queries for reports:
 * - Data source queries
 * - Field selections
 * - Filtering
 * - Grouping and aggregations
 * - Sorting
 */
@Injectable()
export class ReportQueryBuilderService {
  private readonly logger = new Logger(ReportQueryBuilderService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Build query for report definition
   */
  async buildQuery(reportDefinition: ReportDefinition): Promise<SelectQueryBuilder<any>> {
    const dataSourceConfig = reportDefinition.dataSourceConfig;

    if (!dataSourceConfig || !dataSourceConfig.type) {
      throw new BadRequestException('Invalid data source configuration');
    }

    let queryBuilder: SelectQueryBuilder<any>;

    switch (dataSourceConfig.type) {
      case 'entity':
        queryBuilder = await this.buildEntityQuery(dataSourceConfig);
        break;

      case 'table':
        queryBuilder = await this.buildTableQuery(dataSourceConfig);
        break;

      case 'raw':
        queryBuilder = await this.buildRawQuery(dataSourceConfig);
        break;

      default:
        throw new BadRequestException(`Unsupported data source type: ${dataSourceConfig.type}`);
    }

    // Apply field selections
    if (reportDefinition.fieldSelections && reportDefinition.fieldSelections.length > 0) {
      this.applyFieldSelections(queryBuilder, reportDefinition.fieldSelections);
    }

    // Apply filters
    if (reportDefinition.filterConfig) {
      this.applyFilters(queryBuilder, reportDefinition.filterConfig);
    }

    // Apply grouping
    if (reportDefinition.groupingConfig) {
      this.applyGrouping(queryBuilder, reportDefinition.groupingConfig);
    }

    // Apply sorting
    if (reportDefinition.sortingConfig) {
      this.applySorting(queryBuilder, reportDefinition.sortingConfig);
    }

    return queryBuilder;
  }

  /**
   * Build query from entity
   */
  private async buildEntityQuery(config: Record<string, any>): Promise<SelectQueryBuilder<any>> {
    const { entity, alias } = config;

    if (!entity) {
      throw new BadRequestException('Entity name is required for entity data source');
    }

    const entityClass = this.getEntityClass(entity);
    if (!entityClass) {
      throw new BadRequestException(`Entity ${entity} not found`);
    }

    const queryAlias = alias || entity.toLowerCase();
    return this.dataSource.createQueryBuilder().select().from(entityClass, queryAlias);
  }

  /**
   * Build query from table
   */
  private async buildTableQuery(config: Record<string, any>): Promise<SelectQueryBuilder<any>> {
    const { table, alias } = config;

    if (!table) {
      throw new BadRequestException('Table name is required for table data source');
    }

    const queryAlias = alias || table.toLowerCase();
    return this.dataSource.createQueryBuilder().select().from(table, queryAlias);
  }

  /**
   * Build raw query
   */
  private async buildRawQuery(config: Record<string, any>): Promise<SelectQueryBuilder<any>> {
    const { query, parameters } = config;

    if (!query) {
      throw new BadRequestException('Query is required for raw data source');
    }

    // For raw queries, we'll use the query runner directly
    // This is a simplified version - in production, you'd want more sophisticated handling
    throw new BadRequestException('Raw queries are not yet fully supported');
  }

  /**
   * Apply field selections
   */
  private applyFieldSelections(
    queryBuilder: SelectQueryBuilder<any>,
    fieldSelections: Record<string, any>[],
  ): void {
    queryBuilder.select([]); // Clear default select

    fieldSelections.forEach((field) => {
      const fieldPath = field.path || field.field;
      const alias = field.alias || fieldPath.split('.').pop();

      if (field.aggregation) {
        // Apply aggregation
        switch (field.aggregation.toUpperCase()) {
          case 'SUM':
            queryBuilder.addSelect(`SUM(${fieldPath})`, alias);
            break;
          case 'AVG':
          case 'AVERAGE':
            queryBuilder.addSelect(`AVG(${fieldPath})`, alias);
            break;
          case 'COUNT':
            queryBuilder.addSelect(`COUNT(${fieldPath})`, alias);
            break;
          case 'MIN':
            queryBuilder.addSelect(`MIN(${fieldPath})`, alias);
            break;
          case 'MAX':
            queryBuilder.addSelect(`MAX(${fieldPath})`, alias);
            break;
          default:
            queryBuilder.addSelect(fieldPath, alias);
        }
      } else {
        queryBuilder.addSelect(fieldPath, alias);
      }
    });
  }

  /**
   * Apply filters
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<any>,
    filterConfig: Record<string, any>,
  ): void {
    if (filterConfig.conditions && Array.isArray(filterConfig.conditions)) {
      filterConfig.conditions.forEach((condition: any, index: number) => {
        const { field, operator, value, logicalOperator } = condition;
        const paramName = `filter_${index}`;

        let whereClause: string;
        switch (operator.toUpperCase()) {
          case 'EQUALS':
          case '=':
            whereClause = `${field} = :${paramName}`;
            break;
          case 'NOT_EQUALS':
          case '!=':
            whereClause = `${field} != :${paramName}`;
            break;
          case 'GREATER_THAN':
          case '>':
            whereClause = `${field} > :${paramName}`;
            break;
          case 'LESS_THAN':
          case '<':
            whereClause = `${field} < :${paramName}`;
            break;
          case 'GREATER_THAN_OR_EQUAL':
          case '>=':
            whereClause = `${field} >= :${paramName}`;
            break;
          case 'LESS_THAN_OR_EQUAL':
          case '<=':
            whereClause = `${field} <= :${paramName}`;
            break;
          case 'LIKE':
            whereClause = `${field} LIKE :${paramName}`;
            break;
          case 'IN':
            whereClause = `${field} IN (:...${paramName})`;
            break;
          case 'NOT_IN':
            whereClause = `${field} NOT IN (:...${paramName})`;
            break;
          case 'IS_NULL':
            whereClause = `${field} IS NULL`;
            break;
          case 'IS_NOT_NULL':
            whereClause = `${field} IS NOT NULL`;
            break;
          default:
            whereClause = `${field} = :${paramName}`;
        }

        if (index === 0) {
          queryBuilder.where(whereClause, { [paramName]: value });
        } else {
          const logicalOp = logicalOperator?.toUpperCase() || 'AND';
          if (logicalOp === 'OR') {
            queryBuilder.orWhere(whereClause, { [paramName]: value });
          } else {
            queryBuilder.andWhere(whereClause, { [paramName]: value });
          }
        }
      });
    }
  }

  /**
   * Apply grouping
   */
  private applyGrouping(
    queryBuilder: SelectQueryBuilder<any>,
    groupingConfig: Record<string, any>,
  ): void {
    if (groupingConfig.fields && Array.isArray(groupingConfig.fields)) {
      groupingConfig.fields.forEach((field: string) => {
        queryBuilder.addGroupBy(field);
      });
    }

    if (groupingConfig.having) {
      queryBuilder.having(groupingConfig.having.condition, groupingConfig.having.parameters || {});
    }
  }

  /**
   * Apply sorting
   */
  private applySorting(
    queryBuilder: SelectQueryBuilder<any>,
    sortingConfig: Record<string, any>,
  ): void {
    if (sortingConfig.fields && Array.isArray(sortingConfig.fields)) {
      sortingConfig.fields.forEach((sort: any, index: number) => {
        const field = typeof sort === 'string' ? sort : sort.field;
        const direction = (typeof sort === 'object' && sort.direction) || 'ASC';
        const order = direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        if (index === 0) {
          queryBuilder.orderBy(field, order);
        } else {
          queryBuilder.addOrderBy(field, order);
        }
      });
    }
  }

  /**
   * Get entity class by name
   */
  private getEntityClass(entityName: string): any {
    // This is a simplified version - in production, you'd maintain a registry
    // of entity classes or use reflection to find them
    try {
      // Try to get from TypeORM metadata
      const entities = this.dataSource.entityMetadatas;
      const entityMetadata = entities.find((e) => e.name === entityName);
      return entityMetadata?.target;
    } catch (error) {
      this.logger.error(`Error finding entity class for ${entityName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Execute query and return results
   */
  async executeQuery(queryBuilder: SelectQueryBuilder<any>): Promise<any[]> {
    return queryBuilder.getMany();
  }

  /**
   * Execute query and return raw results
   */
  async executeRawQuery(queryBuilder: SelectQueryBuilder<any>): Promise<any[]> {
    return queryBuilder.getRawMany();
  }

  /**
   * Get query count
   */
  async getQueryCount(queryBuilder: SelectQueryBuilder<any>): Promise<number> {
    return queryBuilder.getCount();
  }
}
