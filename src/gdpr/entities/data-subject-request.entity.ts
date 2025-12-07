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
import { User } from '../../users/entities/user.entity';

/**
 * Request Type Enum
 */
export enum RequestType {
  ACCESS = 'ACCESS',
  DELETION = 'DELETION',
  PORTABILITY = 'PORTABILITY',
  RECTIFICATION = 'RECTIFICATION',
  RESTRICTION = 'RESTRICTION',
}

/**
 * Request Status Enum
 */
export enum RequestStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

/**
 * Priority Enum
 */
export enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Data Subject Type Enum
 */
export enum DataSubjectType {
  USER = 'USER',
  EMPLOYEE = 'EMPLOYEE',
  CANDIDATE = 'CANDIDATE',
  CONTACT = 'CONTACT',
  OTHER = 'OTHER',
}

/**
 * Verification Method Enum
 */
export enum VerificationMethod {
  EMAIL = 'EMAIL',
  ID_DOCUMENT = 'ID_DOCUMENT',
  PHONE = 'PHONE',
  OTHER = 'OTHER',
}

/**
 * Verification Status Enum
 */
export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

/**
 * Data Subject Request Entity
 *
 * GDPR data subject requests (access, deletion, portability, etc.)
 */
@Entity('data_subject_requests')
@Index('idx_data_subject_requests_type', ['requestType'])
@Index('idx_data_subject_requests_status', ['requestStatus'])
@Index('idx_data_subject_requests_email', ['dataSubjectEmail'])
@Index('idx_data_subject_requests_identifier', ['dataSubjectIdentifier'])
@Index('idx_data_subject_requests_due_date', ['dueDate'])
@Index('idx_data_subject_requests_assigned', ['assignedToId'])
@Index('idx_data_subject_requests_created', ['createdAt'])
export class DataSubjectRequest {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'request_key', type: 'varchar', length: 128, unique: true, nullable: false })
  requestKey: string;

  @Column({ name: 'request_type', type: 'varchar', length: 64, nullable: false })
  requestType: RequestType;

  @Column({
    name: 'request_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: RequestStatus.PENDING,
  })
  requestStatus: RequestStatus;

  @Column({ type: 'varchar', length: 32, nullable: false, default: Priority.NORMAL })
  priority: Priority;

  // Data subject information
  @Column({ name: 'data_subject_email', type: 'varchar', length: 255, nullable: true })
  dataSubjectEmail: string | null;

  @Column({ name: 'data_subject_name', type: 'varchar', length: 255, nullable: true })
  dataSubjectName: string | null;

  @Column({ name: 'data_subject_identifier', type: 'varchar', length: 255, nullable: true })
  dataSubjectIdentifier: string | null;

  @Column({ name: 'data_subject_type', type: 'varchar', length: 64, nullable: true })
  dataSubjectType: DataSubjectType | null;

  // Request details
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'verification_method', type: 'varchar', length: 64, nullable: true })
  verificationMethod: VerificationMethod | null;

  @Column({
    name: 'verification_status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: VerificationStatus.PENDING,
  })
  verificationStatus: VerificationStatus;

  @Column({ name: 'verification_data', type: 'jsonb', nullable: true })
  verificationData: Record<string, any> | null;

  // Processing
  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: Promise<User> | User | null;

  @Column({ name: 'assigned_to', type: 'bigint', nullable: true })
  assignedToId: number | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date | null;

  // Response/Output
  @Column({ name: 'response_data', type: 'jsonb', nullable: true })
  responseData: Record<string, any> | null;

  @Column({ name: 'export_file_path', type: 'varchar', length: 512, nullable: true })
  exportFilePath: string | null;

  @Column({ name: 'export_file_size', type: 'bigint', nullable: true })
  exportFileSize: number | null;

  @Column({ name: 'export_format', type: 'varchar', length: 32, nullable: true })
  exportFormat: string | null;

  // Deletion/Anonymization
  @Column({ name: 'deletion_status', type: 'varchar', length: 32, nullable: true })
  deletionStatus: string | null;

  @Column({ name: 'anonymization_status', type: 'varchar', length: 32, nullable: true })
  anonymizationStatus: string | null;

  @Column({ name: 'deleted_records_count', type: 'integer', nullable: true })
  deletedRecordsCount: number | null;

  @Column({ name: 'anonymized_records_count', type: 'integer', nullable: true })
  anonymizedRecordsCount: number | null;

  // Rejection/Cancellation
  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'rejection_code', type: 'varchar', length: 64, nullable: true })
  rejectionCode: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'cancelled_by' })
  cancelledBy: Promise<User> | User | null;

  @Column({ name: 'cancelled_by', type: 'bigint', nullable: true })
  cancelledById: number | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null;

  // Audit
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'created_by' })
  createdBy: Promise<User> | User | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: Promise<User> | User | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedById: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}

