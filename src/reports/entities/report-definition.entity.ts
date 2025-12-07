import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReportSchedule } from './report-schedule.entity';
import { Organization } from '../../organizations/entities/organization.entity';

/**
 * Report Type Enum
 */
export enum ReportType {
  TABLE = 'TABLE', // Table report
  CHART = 'CHART', // Chart report
  SUMMARY = 'SUMMARY', // Summary report
  DETAILED = 'DETAILED', // Detailed report
  CUSTOM = 'CUSTOM', // Custom report
}

/**
 * Report Output Format Enum
 */
export enum ReportOutputFormat {
  PDF = 'PDF', // PDF format
  EXCEL = 'EXCEL', // Excel format
  CSV = 'CSV', // CSV format
  JSON = 'JSON', // JSON format
  HTML = 'HTML', // HTML format
}

/**
 * Report Status Enum
 */
export enum ReportStatus {
  DRAFT = 'DRAFT', // Draft report
  ACTIVE = 'ACTIVE', // Active report
  ARCHIVED = 'ARCHIVED', // Archived report
}

/**
 * Report Definition Entity
 *
 * Custom report generation with:
 * - Query builders
 * - Field selections
 * - Grouping and aggregations
 * - Report templates
 * - Multiple output formats
 * - Email delivery
 * - Report sharing and permissions
 */
@Entity('report_definitions')
@Index('idx_report_definitions_organization', ['organizationId'])
@Index('idx_report_definitions_status', ['status'])
@Index('idx_report_definitions_type', ['reportType'])
@Index('idx_report_definitions_category', ['category'])
@Index('idx_report_definitions_active', ['isActive'])
export class ReportDefinition {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Report name
   */
  @Column({ name: 'report_name', type: 'varchar', length: 255, nullable: false })
  reportName: string;

  /**
   * Report description
   */
  @Column({ name: 'report_description', type: 'text', nullable: true })
  reportDescription: string | null;

  /**
   * Organization ID
   */
  @ManyToOne(() => Organization, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  /**
   * Report type
   */
  @Column({
    name: 'report_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ReportType.TABLE,
  })
  reportType: ReportType;

  /**
   * Report status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ReportStatus.DRAFT,
  })
  status: ReportStatus;

  /**
   * Data source configuration (JSON: table, query, entity, etc.)
   */
  @Column({ name: 'data_source_config', type: 'jsonb', nullable: false })
  dataSourceConfig: Record<string, any>;

  /**
   * Field selections (JSON: fields to include, aliases, formatting)
   */
  @Column({ name: 'field_selections', type: 'jsonb', nullable: true })
  fieldSelections: Record<string, any>[] | null;

  /**
   * Filter configuration (JSON: filters, conditions)
   */
  @Column({ name: 'filter_config', type: 'jsonb', nullable: true })
  filterConfig: Record<string, any> | null;

  /**
   * Grouping configuration (JSON: group by fields, aggregations)
   */
  @Column({ name: 'grouping_config', type: 'jsonb', nullable: true })
  groupingConfig: Record<string, any> | null;

  /**
   * Sorting configuration (JSON: sort fields, directions)
   */
  @Column({ name: 'sorting_config', type: 'jsonb', nullable: true })
  sortingConfig: Record<string, any> | null;

  /**
   * Default output format
   */
  @Column({
    name: 'default_output_format',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ReportOutputFormat.PDF,
  })
  defaultOutputFormat: ReportOutputFormat;

  /**
   * Report template (JSON: layout, styling, headers, footers)
   */
  @Column({ name: 'report_template', type: 'jsonb', nullable: true })
  reportTemplate: Record<string, any> | null;

  /**
   * Whether report is a template
   */
  @Column({ name: 'is_template', type: 'boolean', nullable: false, default: false })
  isTemplate: boolean;

  /**
   * Template ID (if cloned from template)
   */
  @Column({ name: 'template_id', type: 'bigint', nullable: true })
  templateId: number | null;

  /**
   * Whether report is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Report category
   */
  @Column({ name: 'category', type: 'varchar', length: 128, nullable: true })
  category: string | null;

  /**
   * Report tags
   */
  @Column({ name: 'tags', type: 'jsonb', nullable: true })
  tags: string[] | null;

  /**
   * Permissions configuration (JSON: view, edit, execute permissions)
   */
  @Column({ name: 'permissions_config', type: 'jsonb', nullable: true })
  permissionsConfig: Record<string, any> | null;

  /**
   * Email delivery configuration (JSON: recipients, subject, body)
   */
  @Column({ name: 'email_config', type: 'jsonb', nullable: true })
  emailConfig: Record<string, any> | null;

  /**
   * Report metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'report_metadata', type: 'jsonb', nullable: true })
  reportMetadata: Record<string, any> | null;

  /**
   * Report schedules
   */
  @OneToMany(() => ReportSchedule, (schedule) => schedule.reportDefinition, {
    cascade: true,
    lazy: true,
  })
  schedules: Promise<ReportSchedule[]> | ReportSchedule[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
