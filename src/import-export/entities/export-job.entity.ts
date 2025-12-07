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
import { Organization } from '../../organizations/entities/organization.entity';
import { ExportTemplate } from './export-template.entity';

/**
 * Export Job Status Enum
 */
export enum ExportJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Export Format Enum
 */
export enum ExportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  JSON = 'JSON',
}

/**
 * Export Delivery Method Enum
 */
export enum ExportDeliveryMethod {
  DOWNLOAD = 'DOWNLOAD',
  EMAIL = 'EMAIL',
  STORAGE = 'STORAGE',
}

/**
 * Export Job Entity
 * 
 * Tracks export jobs with:
 * - Job status and progress
 * - Export format and delivery method
 * - File generation and storage
 * - Email delivery tracking
 * - Scheduled export support
 */
@Entity('export_jobs')
@Index('idx_export_jobs_status', ['status'])
@Index('idx_export_jobs_entity_type', ['entityType'])
@Index('idx_export_jobs_organization', ['organizationId'])
@Index('idx_export_jobs_created', ['createdAt'])
@Index('idx_export_jobs_template', ['templateId'])
@Index('idx_export_jobs_scheduled', ['isScheduled', 'scheduledAt'])
export class ExportJob {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Export template used for this job
   */
  @ManyToOne(() => ExportTemplate, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'template_id' })
  template: Promise<ExportTemplate | null> | ExportTemplate | null;

  @Column({ name: 'template_id', type: 'bigint', nullable: true })
  templateId: number | null;

  /**
   * Entity type being exported (e.g., 'Employee', 'Project', 'Contact')
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
    default: ExportFormat.CSV,
  })
  exportFormat: ExportFormat;

  /**
   * Job status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ExportJobStatus.PENDING,
  })
  status: ExportJobStatus;

  /**
   * Organization this export belongs to
   */
  @ManyToOne(() => Organization, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Promise<Organization> | Organization;

  @Column({ name: 'organization_id', type: 'bigint', nullable: false })
  organizationId: number;

  /**
   * Export file name
   */
  @Column({ name: 'file_name', type: 'varchar', length: 512, nullable: true })
  fileName: string | null;

  /**
   * File size in bytes
   */
  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number | null;

  /**
   * File storage path/URL
   */
  @Column({ name: 'file_path', type: 'varchar', length: 1024, nullable: true })
  filePath: string | null;

  /**
   * Total number of records exported
   */
  @Column({ name: 'total_records', type: 'integer', nullable: false, default: 0 })
  totalRecords: number;

  /**
   * Progress percentage (0-100)
   */
  @Column({ name: 'progress_percentage', type: 'decimal', precision: 5, scale: 2, nullable: false, default: 0 })
  progressPercentage: number;

  /**
   * Error message if job failed
   */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  /**
   * Detailed error information (JSON)
   */
  @Column({ name: 'error_details', type: 'jsonb', nullable: true })
  errorDetails: Record<string, any> | null;

  /**
   * Export query/filters (JSON)
   * Defines what data to export
   */
  @Column({ name: 'export_query', type: 'jsonb', nullable: true })
  exportQuery: Record<string, any> | null;

  /**
   * Field selection (JSON array)
   * Fields to include in export
   */
  @Column({ name: 'field_selection', type: 'jsonb', nullable: true })
  fieldSelection: string[] | null;

  /**
   * Export filters (JSON)
   * Filters to apply to the data
   */
  @Column({ name: 'filters', type: 'jsonb', nullable: true })
  filters: Record<string, any> | null;

  /**
   * Sorting configuration (JSON)
   */
  @Column({ name: 'sorting', type: 'jsonb', nullable: true })
  sorting: Record<string, any> | null;

  /**
   * Delivery method
   */
  @Column({
    name: 'delivery_method',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ExportDeliveryMethod.DOWNLOAD,
  })
  deliveryMethod: ExportDeliveryMethod;

  /**
   * Email recipients (JSON array)
   */
  @Column({ name: 'email_recipients', type: 'jsonb', nullable: true })
  emailRecipients: string[] | null;

  /**
   * Email subject
   */
  @Column({ name: 'email_subject', type: 'varchar', length: 255, nullable: true })
  emailSubject: string | null;

  /**
   * Email body
   */
  @Column({ name: 'email_body', type: 'text', nullable: true })
  emailBody: string | null;

  /**
   * Whether email was sent
   */
  @Column({ name: 'email_sent', type: 'boolean', nullable: false, default: false })
  emailSent: boolean;

  /**
   * Email sent at
   */
  @Column({ name: 'email_sent_at', type: 'timestamptz', nullable: true })
  emailSentAt: Date | null;

  /**
   * Whether this is a scheduled export
   */
  @Column({ name: 'is_scheduled', type: 'boolean', nullable: false, default: false })
  isScheduled: boolean;

  /**
   * Scheduled execution time
   */
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  /**
   * Schedule recurrence pattern (cron expression or JSON)
   */
  @Column({ name: 'schedule_recurrence', type: 'varchar', length: 255, nullable: true })
  scheduleRecurrence: string | null;

  /**
   * Started processing at
   */
  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  /**
   * Completed processing at
   */
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

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

  /**
   * Calculate progress percentage
   */
  calculateProgress(): number {
    // For exports, progress is typically based on records processed
    // This can be overridden by the service based on actual processing
    return this.progressPercentage;
  }

  /**
   * Check if job is in progress
   */
  isInProgress(): boolean {
    return this.status === ExportJobStatus.PROCESSING;
  }

  /**
   * Check if job is completed
   */
  isCompleted(): boolean {
    return (
      this.status === ExportJobStatus.COMPLETED ||
      this.status === ExportJobStatus.FAILED
    );
  }
}
