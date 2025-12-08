import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CustomFieldDefinition } from './custom-field-definition.entity';

/**
 * Custom Field Value Entity
 *
 * Stores actual values for custom fields on entity instances.
 * Supports different storage strategies based on field type:
 * - Simple types: stored in text_value, number_value, boolean_value, date_value
 * - Complex types: stored in json_value
 * - Files: stored in file_value (reference to file storage)
 *
 * The entity_type and entity_id columns create a polymorphic relationship
 * to any entity in the system.
 */
@Entity('custom_field_values')
@Index('idx_custom_field_val_entity', ['entityType', 'entityId'])
@Index('idx_custom_field_val_definition', ['fieldDefinitionId'])
@Index('idx_custom_field_val_entity_def', ['entityType', 'entityId', 'fieldDefinitionId'], {
  unique: true,
})
@Index('idx_custom_field_val_organization', ['organizationId'])
export class CustomFieldValue {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Entity type this value belongs to (e.g., 'Employee', 'Project')
   */
  @Column({ name: 'entity_type', type: 'varchar', length: 128, nullable: false })
  entityType: string;

  /**
   * Entity ID this value belongs to
   */
  @Column({ name: 'entity_id', type: 'bigint', nullable: false })
  entityId: number;

  /**
   * Custom field definition this value belongs to
   */
  @ManyToOne(() => CustomFieldDefinition, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'field_definition_id' })
  fieldDefinition: CustomFieldDefinition;

  @Column({ name: 'field_definition_id', type: 'bigint', nullable: false })
  fieldDefinitionId: number;

  /**
   * Organization ID (for organization-scoped values)
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Text value (for TEXT, TEXTAREA, EMAIL, URL, PHONE, DROPDOWN, REFERENCE)
   */
  @Column({ name: 'text_value', type: 'text', nullable: true })
  textValue: string | null;

  /**
   * Number value (for NUMBER type)
   */
  @Column({ name: 'number_value', type: 'bigint', nullable: true })
  numberValue: number | null;

  /**
   * Decimal value (for DECIMAL type)
   */
  @Column({ name: 'decimal_value', type: 'decimal', precision: 18, scale: 4, nullable: true })
  decimalValue: number | null;

  /**
   * Boolean value (for BOOLEAN type)
   */
  @Column({ name: 'boolean_value', type: 'boolean', nullable: true })
  booleanValue: boolean | null;

  /**
   * Date value (for DATE type)
   */
  @Column({ name: 'date_value', type: 'date', nullable: true })
  dateValue: Date | null;

  /**
   * DateTime value (for DATETIME type)
   */
  @Column({ name: 'datetime_value', type: 'timestamptz', nullable: true })
  datetimeValue: Date | null;

  /**
   * JSON value (for MULTI_SELECT, FORMULA, complex types)
   */
  @Column({ name: 'json_value', type: 'jsonb', nullable: true })
  jsonValue: any | null;

  /**
   * File value (for FILE type - stores file path or file ID)
   */
  @Column({ name: 'file_value', type: 'varchar', length: 512, nullable: true })
  fileValue: string | null;

  /**
   * Additional metadata (JSON)
   */
  @Column({ name: 'value_metadata', type: 'jsonb', nullable: true })
  valueMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Get the actual value based on field type
   * This is a helper method - actual value retrieval should be done in service
   */
  getValue(): any {
    switch (this.fieldDefinition?.fieldType) {
      case 'TEXT':
      case 'TEXTAREA':
      case 'EMAIL':
      case 'URL':
      case 'PHONE':
      case 'DROPDOWN':
      case 'REFERENCE':
        return this.textValue;
      case 'NUMBER':
        return this.numberValue;
      case 'DECIMAL':
        return this.decimalValue;
      case 'BOOLEAN':
        return this.booleanValue;
      case 'DATE':
        return this.dateValue;
      case 'DATETIME':
        return this.datetimeValue;
      case 'MULTI_SELECT':
      case 'FORMULA':
        return this.jsonValue;
      case 'FILE':
        return this.fileValue;
      default:
        return this.textValue;
    }
  }

  /**
   * Set the value based on field type
   * This is a helper method - actual value setting should be done in service
   */
  setValue(value: any): void {
    // Clear all values first
    this.textValue = null;
    this.numberValue = null;
    this.decimalValue = null;
    this.booleanValue = null;
    this.dateValue = null;
    this.datetimeValue = null;
    this.jsonValue = null;
    this.fileValue = null;

    // Set appropriate value based on type
    if (!this.fieldDefinition) {
      return;
    }

    switch (this.fieldDefinition.fieldType) {
      case 'TEXT':
      case 'TEXTAREA':
      case 'EMAIL':
      case 'URL':
      case 'PHONE':
      case 'DROPDOWN':
      case 'REFERENCE':
        this.textValue = value != null ? String(value) : null;
        break;
      case 'NUMBER':
        this.numberValue = value != null ? Number(value) : null;
        break;
      case 'DECIMAL':
        this.decimalValue = value != null ? Number(value) : null;
        break;
      case 'BOOLEAN':
        this.booleanValue = value != null ? Boolean(value) : null;
        break;
      case 'DATE':
        this.dateValue = value != null ? (value instanceof Date ? value : new Date(value)) : null;
        break;
      case 'DATETIME':
        this.datetimeValue =
          value != null ? (value instanceof Date ? value : new Date(value)) : null;
        break;
      case 'MULTI_SELECT':
      case 'FORMULA':
        this.jsonValue = value;
        break;
      case 'FILE':
        this.fileValue = value != null ? String(value) : null;
        break;
    }
  }
}


