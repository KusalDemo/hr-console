import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { FormDefinition } from './form-definition.entity';

/**
 * Form Response Status Enum
 */
export enum FormResponseStatus {
  DRAFT = 'DRAFT', // Draft response (not submitted)
  SUBMITTED = 'SUBMITTED', // Submitted response
  APPROVED = 'APPROVED', // Approved response
  REJECTED = 'REJECTED', // Rejected response
  PROCESSING = 'PROCESSING', // Processing response
}

/**
 * Form Response Entity
 * 
 * Form submissions with:
 * - Response data
 * - Submission tracking
 * - Status workflow
 * - User tracking (anonymous or authenticated)
 */
@Entity('form_responses')
@Index('idx_form_responses_form', ['formDefinitionId'])
@Index('idx_form_responses_user', ['submittedBy'])
@Index('idx_form_responses_status', ['status'])
@Index('idx_form_responses_submitted', ['submittedAt'])
@Index('idx_form_responses_anonymous', ['isAnonymous'])
export class FormResponse {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Form definition this response belongs to
   */
  @ManyToOne(() => FormDefinition, (form) => form.responses, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'form_definition_id' })
  formDefinition: FormDefinition;

  @Column({ name: 'form_definition_id', type: 'bigint', nullable: false })
  formDefinitionId: number;

  /**
   * Response data (JSON: field values)
   */
  @Column({ name: 'response_data', type: 'jsonb', nullable: false })
  responseData: Record<string, any>;

  /**
   * Response status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: FormResponseStatus.SUBMITTED,
  })
  status: FormResponseStatus;

  /**
   * Whether response is anonymous
   */
  @Column({ name: 'is_anonymous', type: 'boolean', nullable: false, default: false })
  isAnonymous: boolean;

  /**
   * User ID who submitted (null if anonymous)
   */
  @Column({ name: 'submitted_by', type: 'bigint', nullable: true })
  submittedBy: number | null;

  /**
   * Anonymous submitter identifier (email, name, etc.)
   */
  @Column({ name: 'anonymous_identifier', type: 'varchar', length: 255, nullable: true })
  anonymousIdentifier: string | null;

  /**
   * Submission timestamp
   */
  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  /**
   * IP address of submitter
   */
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  /**
   * User agent of submitter
   */
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  /**
   * Workflow instance ID (if integrated with workflow engine)
   */
  @Column({ name: 'workflow_instance_id', type: 'bigint', nullable: true })
  workflowInstanceId: number | null;

  /**
   * Approval/rejection notes
   */
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  /**
   * Approved/rejected by user ID
   */
  @Column({ name: 'processed_by', type: 'bigint', nullable: true })
  processedBy: number | null;

  /**
   * Processing timestamp
   */
  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  /**
   * Response metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'response_metadata', type: 'jsonb', nullable: true })
  responseMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;
}
