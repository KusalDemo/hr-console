import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CustomFieldValue } from './custom-field-value.entity';

/**
 * Custom Field Type Enum
 * Defines the data type of the custom field
 */
export enum CustomFieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DECIMAL = 'DECIMAL',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  BOOLEAN = 'BOOLEAN',
  DROPDOWN = 'DROPDOWN',
  MULTI_SELECT = 'MULTI_SELECT',
  FILE = 'FILE',
  FORMULA = 'FORMULA',
  REFERENCE = 'REFERENCE',
  TEXTAREA = 'TEXTAREA',
  URL = 'URL',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

/**
 * Custom Field Definition Entity
 * 
 * Defines custom fields that can be attached to any entity type.
 * Supports various field types with validation rules, permissions, and conditional visibility.
 * 
 * Features:
 * - Field-level permissions (view, edit)
 * - Validation rules (required, min, max, pattern, etc.)
 * - Conditional visibility based on other fields
 * - Default values
 * - Field ordering
 * - Organization/tenant scoping
 */
@Entity('custom_field_definitions')
@Index('idx_custom_field_def_entity_type', ['entityType'])
@Index('idx_custom_field_def_key', ['fieldKey'])
@Index('idx_custom_field_def_active', ['isActive'])
@Index('idx_custom_field_def_entity_key', ['entityType', 'fieldKey'], { unique: true })
@Index('idx_custom_field_def_organization', ['organizationId'])
export class CustomFieldDefinition {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Entity type this field belongs to (e.g., 'Employee', 'Project', 'Client')
   */
  @Column({ name: 'entity_type', type: 'varchar', length: 128, nullable: false })
  entityType: string;

  /**
   * Unique field key within the entity type (e.g., 'employee_custom_1')
   */
  @Column({ name: 'field_key', type: 'varchar', length: 128, nullable: false })
  fieldKey: string;

  /**
   * Display name for the field
   */
  @Column({ name: 'field_name', type: 'varchar', length: 255, nullable: false })
  fieldName: string;

  /**
   * Field description/help text
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Field data type
   */
  @Column({
    name: 'field_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: CustomFieldType.TEXT,
  })
  fieldType: CustomFieldType;

  /**
   * Whether field is required
   */
  @Column({ name: 'is_required', type: 'boolean', nullable: false, default: false })
  isRequired: boolean;

  /**
   * Whether field is active (can be deactivated without deleting)
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Display order (for UI rendering)
   */
  @Column({ name: 'display_order', type: 'integer', nullable: false, default: 0 })
  displayOrder: number;

  /**
   * Default value (JSON string for complex types)
   */
  @Column({ name: 'default_value', type: 'text', nullable: true })
  defaultValue: string | null;

  /**
   * Validation rules (JSON)
   * Example: { min: 0, max: 100, pattern: '^[A-Z]+$', minLength: 5, maxLength: 50 }
   */
  @Column({ name: 'validation_rules', type: 'jsonb', nullable: true })
  validationRules: Record<string, any> | null;

  /**
   * Options for DROPDOWN and MULTI_SELECT types (JSON array)
   * Example: [{ value: 'option1', label: 'Option 1' }, { value: 'option2', label: 'Option 2' }]
   */
  @Column({ type: 'jsonb', nullable: true })
  options: Array<{ value: string; label: string }> | null;

  /**
   * Reference configuration for REFERENCE type (JSON)
   * Example: { entityType: 'Employee', displayField: 'fullName', valueField: 'id' }
   */
  @Column({ name: 'reference_config', type: 'jsonb', nullable: true })
  referenceConfig: Record<string, any> | null;

  /**
   * Formula for FORMULA type (expression string)
   */
  @Column({ type: 'text', nullable: true })
  formula: string | null;

  /**
   * Conditional visibility rules (JSON)
   * Example: { field: 'status', operator: 'equals', value: 'active' }
   */
  @Column({ name: 'visibility_rules', type: 'jsonb', nullable: true })
  visibilityRules: Record<string, any> | null;

  /**
   * Field-level permissions (JSON)
   * Example: { view: ['ADMIN', 'HR'], edit: ['ADMIN'] }
   */
  @Column({ name: 'permissions', type: 'jsonb', nullable: true })
  permissions: Record<string, string[]> | null;

  /**
   * Organization ID (for organization-scoped fields)
   * Null means field is available to all organizations in tenant
   */
  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Additional metadata (JSON)
   */
  @Column({ name: 'field_metadata', type: 'jsonb', nullable: true })
  fieldMetadata: Record<string, any> | null;

  /**
   * Custom field values for this definition
   */
  @OneToMany(() => CustomFieldValue, (value) => value.fieldDefinition, {
    cascade: false,
    lazy: true,
  })
  values: Promise<CustomFieldValue[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if field is visible based on visibility rules
   * This is a helper method - actual evaluation should be done in service
   */
  hasVisibilityRules(): boolean {
    return this.visibilityRules !== null && Object.keys(this.visibilityRules).length > 0;
  }

  /**
   * Check if field has permissions configured
   */
  hasPermissions(): boolean {
    return this.permissions !== null && Object.keys(this.permissions).length > 0;
  }

  /**
   * Check if field supports options (dropdown/multi-select)
   */
  supportsOptions(): boolean {
    return (
      this.fieldType === CustomFieldType.DROPDOWN ||
      this.fieldType === CustomFieldType.MULTI_SELECT
    );
  }
}

