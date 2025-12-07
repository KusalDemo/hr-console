import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { ImportJob } from './import-job.entity';

/**
 * Import Template Entity
 *
 * Defines reusable import templates with:
 * - Field mappings
 * - Validation rules
 * - Data transformation rules
 * - Default configurations
 */
@Entity('import_templates')
@Index('idx_import_templates_entity_type', ['entityType'])
@Index('idx_import_templates_organization', ['organizationId'])
@Index('idx_import_templates_active', ['isActive'])
export class ImportTemplate {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Template name
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  /**
   * Template description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Entity type this template is for (e.g., 'Employee', 'Project', 'Contact')
   */
  @Column({ name: 'entity_type', type: 'varchar', length: 128, nullable: false })
  entityType: string;

  /**
   * Import format (CSV, EXCEL, JSON)
   */
  @Column({
    name: 'import_format',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: 'CSV',
  })
  importFormat: string;

  /**
   * Organization this template belongs to (null = global template)
   */
  @ManyToOne(() => Organization, {
    nullable: true,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Promise<Organization | null> | Organization | null;

  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number | null;

  /**
   * Field mappings (JSON)
   * Maps source columns/fields to target entity fields
   * Example: { "First Name": "firstName", "Last Name": "lastName", "Email": "email" }
   */
  @Column({ name: 'field_mappings', type: 'jsonb', nullable: false })
  fieldMappings: Record<string, string>;

  /**
   * Validation rules (JSON)
   * Defines validation rules for each field
   * Example: { "email": { "required": true, "type": "email" }, "age": { "min": 18, "max": 100 } }
   */
  @Column({ name: 'validation_rules', type: 'jsonb', nullable: true })
  validationRules: Record<string, any> | null;

  /**
   * Data transformation rules (JSON)
   * Defines transformations to apply to data before import
   * Example: { "firstName": { "transform": "uppercase" }, "date": { "format": "YYYY-MM-DD" } }
   */
  @Column({ name: 'transformation_rules', type: 'jsonb', nullable: true })
  transformationRules: Record<string, any> | null;

  /**
   * Default values for fields (JSON)
   * Fields that should have default values if not provided
   */
  @Column({ name: 'default_values', type: 'jsonb', nullable: true })
  defaultValues: Record<string, any> | null;

  /**
   * Duplicate detection configuration (JSON)
   * Defines how to detect duplicates
   * Example: { "fields": ["email"], "strategy": "update" }
   */
  @Column({ name: 'duplicate_detection', type: 'jsonb', nullable: true })
  duplicateDetection: Record<string, any> | null;

  /**
   * Merge strategy for duplicates
   * Options: 'skip', 'update', 'error', 'merge'
   */
  @Column({ name: 'merge_strategy', type: 'varchar', length: 32, nullable: true, default: 'skip' })
  mergeStrategy: string | null;

  /**
   * Whether to rollback on failure
   */
  @Column({ name: 'rollback_on_failure', type: 'boolean', nullable: false, default: true })
  rollbackOnFailure: boolean;

  /**
   * Batch size for processing
   */
  @Column({ name: 'batch_size', type: 'integer', nullable: false, default: 100 })
  batchSize: number;

  /**
   * Whether template is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Whether this is a system template (cannot be deleted)
   */
  @Column({ name: 'is_system', type: 'boolean', nullable: false, default: false })
  isSystem: boolean;

  /**
   * Import jobs using this template
   */
  @OneToMany(() => ImportJob, (job) => job.template, {
    cascade: false,
    lazy: true,
  })
  importJobs: Promise<ImportJob[]> | ImportJob[];

  /**
   * Additional metadata (JSON)
   */
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
