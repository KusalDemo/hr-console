import { Injectable } from '@nestjs/common';
import { DataSource, Repository, In } from 'typeorm';
import { CustomFieldValue } from '../entities/custom-field-value.entity';

/**
 * Custom Field Value Repository
 * Provides custom queries for custom field value operations
 */
@Injectable()
export class CustomFieldValueRepository extends Repository<CustomFieldValue> {
  constructor(private dataSource: DataSource) {
    super(CustomFieldValue, dataSource.createEntityManager());
  }

  /**
   * Find value by ID
   */
  async findById(id: number, includeRelations = false): Promise<CustomFieldValue | null> {
    const query = this.createQueryBuilder('value').where('value.id = :id', { id });

    if (includeRelations) {
      query.leftJoinAndSelect('value.fieldDefinition', 'fieldDefinition');
    }

    return query.getOne();
  }

  /**
   * Find value by entity and field definition
   */
  async findByEntityAndField(
    entityType: string,
    entityId: number,
    fieldDefinitionId: number,
  ): Promise<CustomFieldValue | null> {
    return this.findOne({
      where: {
        entityType,
        entityId,
        fieldDefinitionId,
      },
      relations: ['fieldDefinition'],
    });
  }

  /**
   * Find all values for an entity
   */
  async findByEntity(
    entityType: string,
    entityId: number,
    organizationId?: number,
  ): Promise<CustomFieldValue[]> {
    const query = this.createQueryBuilder('value')
      .leftJoinAndSelect('value.fieldDefinition', 'fieldDefinition')
      .where('value.entityType = :entityType', { entityType })
      .andWhere('value.entityId = :entityId', { entityId });

    if (organizationId !== undefined) {
      query.andWhere(
        '(value.organizationId = :organizationId OR value.organizationId IS NULL)',
        { organizationId },
      );
    }

    return query
      .orderBy('fieldDefinition.displayOrder', 'ASC')
      .addOrderBy('fieldDefinition.fieldName', 'ASC')
      .getMany();
  }

  /**
   * Find values by field definition
   */
  async findByFieldDefinition(
    fieldDefinitionId: number,
    organizationId?: number,
  ): Promise<CustomFieldValue[]> {
    const query = this.createQueryBuilder('value')
      .leftJoinAndSelect('value.fieldDefinition', 'fieldDefinition')
      .where('value.fieldDefinitionId = :fieldDefinitionId', { fieldDefinitionId });

    if (organizationId !== undefined) {
      query.andWhere(
        '(value.organizationId = :organizationId OR value.organizationId IS NULL)',
        { organizationId },
      );
    }

    return query.getMany();
  }

  /**
   * Find values for multiple entities (bulk operation)
   */
  async findByEntities(
    entityType: string,
    entityIds: number[],
    organizationId?: number,
  ): Promise<CustomFieldValue[]> {
    if (entityIds.length === 0) {
      return [];
    }

    const query = this.createQueryBuilder('value')
      .leftJoinAndSelect('value.fieldDefinition', 'fieldDefinition')
      .where('value.entityType = :entityType', { entityType })
      .andWhere('value.entityId IN (:...entityIds)', { entityIds });

    if (organizationId !== undefined) {
      query.andWhere(
        '(value.organizationId = :organizationId OR value.organizationId IS NULL)',
        { organizationId },
      );
    }

    return query
      .orderBy('value.entityId', 'ASC')
      .addOrderBy('fieldDefinition.displayOrder', 'ASC')
      .getMany();
  }

  /**
   * Find values by field definitions (for filtering/searching)
   */
  async findByFieldDefinitions(
    fieldDefinitionIds: number[],
    organizationId?: number,
  ): Promise<CustomFieldValue[]> {
    if (fieldDefinitionIds.length === 0) {
      return [];
    }

    const query = this.createQueryBuilder('value')
      .leftJoinAndSelect('value.fieldDefinition', 'fieldDefinition')
      .where('value.fieldDefinitionId IN (:...fieldDefinitionIds)', { fieldDefinitionIds });

    if (organizationId !== undefined) {
      query.andWhere(
        '(value.organizationId = :organizationId OR value.organizationId IS NULL)',
        { organizationId },
      );
    }

    return query.getMany();
  }

  /**
   * Delete values for an entity
   */
  async deleteByEntity(entityType: string, entityId: number): Promise<void> {
    await this.delete({
      entityType,
      entityId,
    });
  }

  /**
   * Delete values by field definition
   */
  async deleteByFieldDefinition(fieldDefinitionId: number): Promise<void> {
    await this.delete({
      fieldDefinitionId,
    });
  }

  /**
   * Bulk upsert values (for performance)
   * Uses raw query for better performance
   */
  async bulkUpsertValues(values: Array<Partial<CustomFieldValue>>): Promise<void> {
    if (values.length === 0) {
      return;
    }

    // Use raw query for bulk upsert
    const valueStrings = values.map((v, index) => {
      const baseIndex = index * 10;
      return `(
        $${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4},
        $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8},
        $${baseIndex + 9}, $${baseIndex + 10}
      )`;
    });

    const params: any[] = [];
    values.forEach((v) => {
      params.push(
        v.entityType,
        v.entityId,
        v.fieldDefinitionId,
        v.organizationId || null,
        v.textValue || null,
        v.numberValue || null,
        v.decimalValue || null,
        v.booleanValue || null,
        v.dateValue || null,
        v.datetimeValue || null,
      );
    });

    const query = `
      INSERT INTO custom_field_values (
        entity_type, entity_id, field_definition_id, organization_id,
        text_value, number_value, decimal_value, boolean_value, date_value, datetime_value
      ) VALUES ${valueStrings.join(', ')}
      ON CONFLICT (entity_type, entity_id, field_definition_id)
      DO UPDATE SET
        text_value = EXCLUDED.text_value,
        number_value = EXCLUDED.number_value,
        decimal_value = EXCLUDED.decimal_value,
        boolean_value = EXCLUDED.boolean_value,
        date_value = EXCLUDED.date_value,
        datetime_value = EXCLUDED.datetime_value,
        updated_at = now()
    `;

    await this.query(query, params);
  }
}


