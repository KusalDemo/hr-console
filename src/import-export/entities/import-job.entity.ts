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
import { ImportTemplate } from './import-template.entity';

/**
 * Import Job Status Enum
 */
export enum ImportJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
}

/**
 * Import Format Enum
 */
export enum ImportFormat {
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  JSON = 'JSON',
}

/**
 * Import Job Entity
 *
 * Tracks import jobs with:
 * - Job status and progress
 * - Error handling and rollback
 * - Batch processing
 * - Import statistics
 * - File metadata
 */
@Entity('import_jobs')
@Index('idx_import_jobs_status', ['status'])
@Index('idx_import_jobs_entity_type', ['entityType'])
@Index('idx_import_jobs_organization', ['organizationId'])
@Index('idx_import_jobs_created', ['createdAt'])
@Index('idx_import_jobs_template', ['templateId'])
export class ImportJob {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Import template used for this job
   */
  @ManyToOne(() => ImportTemplate, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'template_id' })
  template: Promise<ImportTemplate | null> | ImportTemplate | null;

  @Column({ name: 'template_id', type: 'bigint', nullable: true })
  templateId: number | null;

  /**
   * Entity type being imported (e.g., 'Employee', 'Project', 'Contact')
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
    default: ImportFormat.CSV,
  })
  importFormat: ImportFormat;

  /**
   * Job status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: ImportJobStatus.PENDING,
  })
  status: ImportJobStatus;

  /**
   * Organization this import belongs to
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
   * File name of the imported file
   */
  @Column({ name: 'file_name', type: 'varchar', length: 512, nullable: false })
  fileName: string;

  /**
   * File size in bytes
   */
  @Column({ name: 'file_size', type: 'bigint', nullable: false })
  fileSize: number;

  /**
   * File storage path/URL
   */
  @Column({ name: 'file_path', type: 'varchar', length: 1024, nullable: false })
  filePath: string;

  /**
   * Total number of rows/records in the file
   */
  @Column({ name: 'total_records', type: 'integer', nullable: false, default: 0 })
  totalRecords: number;

  /**
   * Number of records successfully processed
   */
  @Column({ name: 'processed_records', type: 'integer', nullable: false, default: 0 })
  processedRecords: number;

  /**
   * Number of records that failed
   */
  @Column({ name: 'failed_records', type: 'integer', nullable: false, default: 0 })
  failedRecords: number;

  /**
   * Number of records skipped (duplicates, etc.)
   */
  @Column({ name: 'skipped_records', type: 'integer', nullable: false, default: 0 })
  skippedRecords: number;

  /**
   * Progress percentage (0-100)
   */
  @Column({
    name: 'progress_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: false,
    default: 0,
  })
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
   * Import errors by row (JSON array)
   * Format: [{ row: number, errors: string[], data: any }]
   */
  @Column({ name: 'row_errors', type: 'jsonb', nullable: true })
  rowErrors: Array<{ row: number; errors: string[]; data: any }> | null;

  /**
   * Import configuration (JSON)
   * Includes field mappings, validation rules, merge strategies, etc.
   */
  @Column({ name: 'import_config', type: 'jsonb', nullable: true })
  importConfig: Record<string, any> | null;

  /**
   * Whether to rollback on failure
   */
  @Column({ name: 'rollback_on_failure', type: 'boolean', nullable: false, default: true })
  rollbackOnFailure: boolean;

  /**
   * Whether this is an incremental import (update existing records)
   */
  @Column({ name: 'is_incremental', type: 'boolean', nullable: false, default: false })
  isIncremental: boolean;

  /**
   * Duplicate detection strategy
   * Options: 'skip', 'update', 'error', 'merge'
   */
  @Column({ name: 'duplicate_strategy', type: 'varchar', length: 32, nullable: true })
  duplicateStrategy: string | null;

  /**
   * Batch size for processing
   */
  @Column({ name: 'batch_size', type: 'integer', nullable: false, default: 100 })
  batchSize: number;

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
    if (this.totalRecords === 0) {
      return 0;
    }
    const processed = this.processedRecords + this.failedRecords + this.skippedRecords;
    return Math.round((processed / this.totalRecords) * 100 * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Check if job is in progress
   */
  isInProgress(): boolean {
    return this.status === ImportJobStatus.PROCESSING;
  }

  /**
   * Check if job is completed (successfully or with errors)
   */
  isCompleted(): boolean {
    return (
      this.status === ImportJobStatus.COMPLETED ||
      this.status === ImportJobStatus.FAILED ||
      this.status === ImportJobStatus.PARTIALLY_COMPLETED
    );
  }
}
