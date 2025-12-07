import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CustomFieldDefinition, CustomFieldType } from '../entities/custom-field-definition.entity';

/**
 * Custom Field Definition Repository
 * Provides custom queries for custom field definition operations
 */
@Injectable()
export class CustomFieldDefinitionRepository extends Repository<CustomFieldDefinition> {
  constructor(private dataSource: DataSource) {
    super(CustomFieldDefinition, dataSource.createEntityManager());
  }

  /**
   * Find field definition by ID
   */
  async findById(id: number, includeRelations = false): Promise<CustomFieldDefinition | null> {
    const query = this.createQueryBuilder('field')
      .where('field.id = :id', { id })
      .andWhere('field.isActive = :isActive', { isActive: true });

    if (includeRelations) {
      query.leftJoinAndSelect('field.values', 'values');
    }

    return query.getOne();
  }

  /**
   * Find field definition by entity type and field key
   */
  async findByEntityAndKey(
    entityType: string,
    fieldKey: string,
  ): Promise<CustomFieldDefinition | null> {
    return this.findOne({
      where: {
        entityType,
        fieldKey,
        isActive: true,
      },
    });
  }

  /**
   * Find all field definitions for an entity type
   */
  async findByEntityType(
    entityType: string,
    organizationId?: number,
  ): Promise<CustomFieldDefinition[]> {
    const query = this.createQueryBuilder('field')
      .where('field.entityType = :entityType', { entityType })
      .andWhere('field.isActive = :isActive', { isActive: true })
      .orderBy('field.displayOrder', 'ASC')
      .addOrderBy('field.fieldName', 'ASC');

    if (organizationId !== undefined) {
      query.andWhere(
        '(field.organizationId = :organizationId OR field.organizationId IS NULL)',
        { organizationId },
      );
    }

    return query.getMany();
  }

  /**
   * Find field definitions by organization
   */
  async findByOrganization(organizationId: number): Promise<CustomFieldDefinition[]> {
    return this.find({
      where: {
        organizationId,
        isActive: true,
      },
      order: {
        displayOrder: 'ASC',
        fieldName: 'ASC',
      },
    });
  }

  /**
   * Check if field key exists for entity type
   */
  async fieldKeyExists(
    entityType: string,
    fieldKey: string,
    excludeId?: number,
  ): Promise<boolean> {
    const query = this.createQueryBuilder('field')
      .where('field.entityType = :entityType', { entityType })
      .andWhere('field.fieldKey = :fieldKey', { fieldKey });

    if (excludeId) {
      query.andWhere('field.id != :excludeId', { excludeId });
    }

    const count = await query.getCount();
    return count > 0;
  }

  /**
   * Find field definitions with pagination
   */
  async findWithPagination(
    page: number,
    limit: number,
    filters?: {
      entityType?: string;
      fieldType?: CustomFieldType;
      organizationId?: number;
      isActive?: boolean;
    },
  ): Promise<{ fields: CustomFieldDefinition[]; total: number }> {
    const query = this.createQueryBuilder('field');

    if (filters?.entityType) {
      query.andWhere('field.entityType = :entityType', { entityType: filters.entityType });
    }

    if (filters?.fieldType) {
      query.andWhere('field.fieldType = :fieldType', { fieldType: filters.fieldType });
    }

    if (filters?.organizationId !== undefined) {
      query.andWhere(
        '(field.organizationId = :organizationId OR field.organizationId IS NULL)',
        { organizationId: filters.organizationId },
      );
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('field.isActive = :isActive', { isActive: filters.isActive });
    }

    query
      .orderBy('field.displayOrder', 'ASC')
      .addOrderBy('field.fieldName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [fields, total] = await query.getManyAndCount();

    return { fields, total };
  }

  /**
   * Count field definitions by entity type
   */
  async countByEntityType(entityType: string, organizationId?: number): Promise<number> {
    const query = this.createQueryBuilder('field')
      .where('field.entityType = :entityType', { entityType })
      .andWhere('field.isActive = :isActive', { isActive: true });

    if (organizationId !== undefined) {
      query.andWhere(
        '(field.organizationId = :organizationId OR field.organizationId IS NULL)',
        { organizationId },
      );
    }

    return query.getCount();
  }
}


