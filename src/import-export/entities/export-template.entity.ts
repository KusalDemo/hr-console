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
import { ExportJob } from './export-job.entity';

/**
 * Export Template Entity
 *
 * Defines reusable export templates with:
 * - Field selection
 * - Formatting rules
 * - Filters
 * - Default configurations
 * - Scheduled export settings
 */
@Entity('export_templates')
@Index('idx_export_templates_entity_type', ['entityType'])
@Index('idx_export_templates_organization', ['organizationId'])
@Index('idx_export_templates_active', ['isActive'])
export class ExportTemplate {
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
   * Export format (PDF, EXCEL, CSV, JSON)
   */
  @Column({
    name: 'export_format',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: 'CSV',
  })
  exportFormat: string;

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
   * Field selection (JSON array)
   * Fields to include in export
   */
  @Column({ name: 'field_selection', type: 'jsonb', nullable: true })
  fieldSelection: string[] | null;

  /**
   * Field formatting rules (JSON)
   * Defines how to format each field
   * Example: { "date": { "format": "YYYY-MM-DD" }, "currency": { "format": "USD" } }
   */
  @Column({ name: 'formatting_rules', type: 'jsonb', nullable: true })
  formattingRules: Record<string, any> | null;

  /**
   * Default filters (JSON)
   * Default filters to apply
   */
  @Column({ name: 'default_filters', type: 'jsonb', nullable: true })
  defaultFilters: Record<string, any> | null;

  /**
   * Default sorting (JSON)
   */
  @Column({ name: 'default_sorting', type: 'jsonb', nullable: true })
  defaultSorting: Record<string, any> | null;

  /**
   * Report query builder configuration (JSON)
   * Defines how to build the query for the export
   */
  @Column({ name: 'query_builder_config', type: 'jsonb', nullable: true })
  queryBuilderConfig: Record<string, any> | null;

  /**
   * PDF template configuration (JSON)
   * For PDF exports, defines layout, headers, footers, etc.
   */
  @Column({ name: 'pdf_template_config', type: 'jsonb', nullable: true })
  pdfTemplateConfig: Record<string, any> | null;

  /**
   * Excel template configuration (JSON)
   * For Excel exports, defines sheet structure, styles, etc.
   */
  @Column({ name: 'excel_template_config', type: 'jsonb', nullable: true })
  excelTemplateConfig: Record<string, any> | null;

  /**
   * Whether template supports scheduled exports
   */
  @Column({ name: 'supports_scheduling', type: 'boolean', nullable: false, default: false })
  supportsScheduling: boolean;

  /**
   * Default email recipients (JSON array)
   */
  @Column({ name: 'default_email_recipients', type: 'jsonb', nullable: true })
  defaultEmailRecipients: string[] | null;

  /**
   * Default email subject
   */
  @Column({ name: 'default_email_subject', type: 'varchar', length: 255, nullable: true })
  defaultEmailSubject: string | null;

  /**
   * Default email body
   */
  @Column({ name: 'default_email_body', type: 'text', nullable: true })
  defaultEmailBody: string | null;

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
   * Export jobs using this template
   */
  @OneToMany(() => ExportJob, (job) => job.template, {
    cascade: false,
    lazy: true,
  })
  exportJobs: Promise<ExportJob[]> | ExportJob[];

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
