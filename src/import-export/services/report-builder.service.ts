import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { ExportTemplate } from '../entities/export-template.entity';

/**
 * Report Builder Service
 *
 * Builds queries for exports based on:
 * - Entity type
 * - Filters
 * - Sorting
 * - Field selection
 * - Query builder configuration
 */
@Injectable()
export class ReportBuilderService {
  private readonly logger = new Logger(ReportBuilderService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Build query for export based on template and filters
   */
  async buildQuery(
    entityType: string,
    template: ExportTemplate | null,
    filters?: Record<string, any>,
    sorting?: Record<string, any>,
    fieldSelection?: string[],
  ): Promise<SelectQueryBuilder<any>> {
    // Get the repository for the entity type
    const repository = this.getRepositoryForEntityType(entityType);
    if (!repository) {
      throw new BadRequestException(`Unsupported entity type: ${entityType}`);
    }

    // Start building query
    const queryBuilder = repository.createQueryBuilder(this.getEntityAlias(entityType));

    // Apply default filters from template
    const mergedFilters = {
      ...(template?.defaultFilters || {}),
      ...(filters || {}),
    };

    // Apply filters
    this.applyFilters(queryBuilder, mergedFilters, entityType);

    // Apply default sorting from template
    const mergedSorting = {
      ...(template?.defaultSorting || {}),
      ...(sorting || {}),
    };

    // Apply sorting
    this.applySorting(queryBuilder, mergedSorting, entityType);

    // Apply field selection
    if (fieldSelection && fieldSelection.length > 0) {
      this.applyFieldSelection(queryBuilder, fieldSelection, entityType);
    } else if (template?.fieldSelection && template.fieldSelection.length > 0) {
      this.applyFieldSelection(queryBuilder, template.fieldSelection, entityType);
    }

    return queryBuilder;
  }

  /**
   * Get repository for entity type
   * Note: This is a simplified implementation. In production, you'd use a registry pattern
   */
  private getRepositoryForEntityType(entityType: string): any {
    // Map entity types to repositories
    // This would need to be extended for each entity type
    const entityRepositoryMap: Record<string, string> = {
      Employee: 'employees',
      Project: 'projects',
      Task: 'tasks',
      Contact: 'contacts',
      // Add more entity types as needed
    };

    const tableName = entityRepositoryMap[entityType];
    if (!tableName) {
      return null;
    }

    // For now, return a basic query builder
    // In production, you'd inject repositories or use a registry
    return {
      createQueryBuilder: (alias: string) => {
        return this.dataSource.createQueryBuilder().select().from(tableName, alias);
      },
    };
  }

  /**
   * Get entity alias for query builder
   */
  private getEntityAlias(entityType: string): string {
    return entityType.toLowerCase();
  }

  /**
   * Apply filters to query builder
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<any>,
    filters: Record<string, any>,
    entityType: string,
  ): void {
    const alias = this.getEntityAlias(entityType);

    Object.keys(filters).forEach((field) => {
      const value = filters[field];

      // Handle different filter types
      if (value === null || value === undefined) {
        return;
      }

      // Handle range filters (e.g., { min: 10, max: 20 })
      if (typeof value === 'object' && !Array.isArray(value)) {
        if (value.min !== undefined) {
          queryBuilder.andWhere(`${alias}.${field} >= :${field}_min`, {
            [`${field}_min`]: value.min,
          });
        }
        if (value.max !== undefined) {
          queryBuilder.andWhere(`${alias}.${field} <= :${field}_max`, {
            [`${field}_max`]: value.max,
          });
        }
        if (value.gte !== undefined) {
          queryBuilder.andWhere(`${alias}.${field} >= :${field}_gte`, {
            [`${field}_gte`]: value.gte,
          });
        }
        if (value.lte !== undefined) {
          queryBuilder.andWhere(`${alias}.${field} <= :${field}_lte`, {
            [`${field}_lte`]: value.lte,
          });
        }
        if (value.like !== undefined) {
          queryBuilder.andWhere(`${alias}.${field} LIKE :${field}_like`, {
            [`${field}_like`]: `%${value.like}%`,
          });
        }
        if (value.in !== undefined && Array.isArray(value.in)) {
          queryBuilder.andWhere(`${alias}.${field} IN (:...${field}_in)`, {
            [`${field}_in`]: value.in,
          });
        }
        return;
      }

      // Handle array filters (IN clause)
      if (Array.isArray(value)) {
        queryBuilder.andWhere(`${alias}.${field} IN (:...${field}_in)`, {
          [`${field}_in`]: value,
        });
        return;
      }

      // Handle simple equality
      queryBuilder.andWhere(`${alias}.${field} = :${field}`, {
        [field]: value,
      });
    });
  }

  /**
   * Apply sorting to query builder
   */
  private applySorting(
    queryBuilder: SelectQueryBuilder<any>,
    sorting: Record<string, any>,
    entityType: string,
  ): void {
    const alias = this.getEntityAlias(entityType);

    Object.keys(sorting).forEach((field) => {
      const direction = sorting[field];
      const order = direction === 'DESC' || direction === 'desc' ? 'DESC' : 'ASC';
      queryBuilder.addOrderBy(`${alias}.${field}`, order);
    });
  }

  /**
   * Apply field selection to query builder
   */
  private applyFieldSelection(
    queryBuilder: SelectQueryBuilder<any>,
    fieldSelection: string[],
    entityType: string,
  ): void {
    const alias = this.getEntityAlias(entityType);

    // Clear default select
    queryBuilder.select([]);

    // Add selected fields
    fieldSelection.forEach((field) => {
      queryBuilder.addSelect(`${alias}.${field}`, field);
    });
  }

  /**
   * Format data based on formatting rules
   */
  formatData(
    data: Array<Record<string, any>>,
    formattingRules: Record<string, any> | null,
  ): Array<Record<string, any>> {
    if (!formattingRules) {
      return data;
    }

    return data.map((record) => {
      const formatted: Record<string, any> = { ...record };

      Object.keys(formattingRules).forEach((field) => {
        if (formatted[field] !== undefined && formatted[field] !== null) {
          const rule = formattingRules[field];
          formatted[field] = this.applyFormatting(formatted[field], rule);
        }
      });

      return formatted;
    });
  }

  /**
   * Apply formatting rule to a value
   */
  private applyFormatting(value: any, rule: any): any {
    if (!rule || typeof rule !== 'object') {
      return value;
    }

    // Date formatting
    if (rule.format && value instanceof Date) {
      // TODO: Implement date formatting based on rule.format
      // This would require a date library like date-fns or moment
      return value.toISOString();
    }

    // Currency formatting
    if (rule.format === 'currency' && typeof value === 'number') {
      const currency = rule.currency || 'USD';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(value);
    }

    // Number formatting
    if (rule.format === 'number' && typeof value === 'number') {
      const decimals = rule.decimals !== undefined ? rule.decimals : 2;
      return value.toFixed(decimals);
    }

    // Percentage formatting
    if (rule.format === 'percentage' && typeof value === 'number') {
      return `${(value * 100).toFixed(2)}%`;
    }

    // Custom formatter function
    if (rule.formatter && typeof rule.formatter === 'string') {
      // TODO: Implement custom formatter evaluation (with security considerations)
      return value;
    }

    return value;
  }
}
