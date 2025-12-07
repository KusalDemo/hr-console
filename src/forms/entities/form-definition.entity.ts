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
import { FormResponse } from './form-response.entity';
import { Organization } from '../../organizations/entities/organization.entity';

/**
 * Form Status Enum
 */
export enum FormStatus {
  DRAFT = 'DRAFT', // Draft form
  PUBLISHED = 'PUBLISHED', // Published form
  ARCHIVED = 'ARCHIVED', // Archived form
}

/**
 * Form Access Type Enum
 */
export enum FormAccessType {
  PUBLIC = 'PUBLIC', // Public form (anonymous submissions allowed)
  AUTHENTICATED = 'AUTHENTICATED', // Requires authentication
  RESTRICTED = 'RESTRICTED', // Restricted access (specific users/roles)
}

/**
 * Form Definition Entity
 * 
 * Dynamic form creation with:
 * - Form schemas (fields, validation, conditional logic)
 * - Form templates, cloning, versioning
 * - Form permissions, anonymous submissions
 * - Workflow integration
 * - Form analytics
 */
@Entity('form_definitions')
@Index('idx_form_definitions_organization', ['organizationId'])
@Index('idx_form_definitions_status', ['status'])
@Index('idx_form_definitions_access', ['accessType'])
@Index('idx_form_definitions_template', ['isTemplate'])
@Index('idx_form_definitions_active', ['isActive'])
@Index('idx_form_definitions_category', ['category'])
export class FormDefinition {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Form name
   */
  @Column({ name: 'form_name', type: 'varchar', length: 255, nullable: false })
  formName: string;

  /**
   * Form description
   */
  @Column({ name: 'form_description', type: 'text', nullable: true })
  formDescription: string | null;

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
   * Form status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: FormStatus.DRAFT,
  })
  status: FormStatus;

  /**
   * Access type
   */
  @Column({
    name: 'access_type',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: FormAccessType.AUTHENTICATED,
  })
  accessType: FormAccessType;

  /**
   * Form schema (JSON: fields, validation rules, conditional logic)
   */
  @Column({ name: 'form_schema', type: 'jsonb', nullable: false })
  formSchema: Record<string, any>;

  /**
   * Form version
   */
  @Column({ name: 'form_version', type: 'integer', nullable: false, default: 1 })
  formVersion: number;

  /**
   * Parent form ID (for versioning)
   */
  @Column({ name: 'parent_form_id', type: 'bigint', nullable: true })
  parentFormId: number | null;

  /**
   * Template ID (if cloned from template)
   */
  @Column({ name: 'template_id', type: 'bigint', nullable: true })
  templateId: number | null;

  /**
   * Whether form is a template
   */
  @Column({ name: 'is_template', type: 'boolean', nullable: false, default: false })
  isTemplate: boolean;

  /**
   * Whether form is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Whether anonymous submissions are allowed
   */
  @Column({ name: 'allow_anonymous', type: 'boolean', nullable: false, default: false })
  allowAnonymous: boolean;

  /**
   * Whether multiple submissions are allowed
   */
  @Column({ name: 'allow_multiple_submissions', type: 'boolean', nullable: false, default: true })
  allowMultipleSubmissions: boolean;

  /**
   * Maximum submissions per user (null = unlimited)
   */
  @Column({ name: 'max_submissions_per_user', type: 'integer', nullable: true })
  maxSubmissionsPerUser: number | null;

  /**
   * Form category
   */
  @Column({ name: 'category', type: 'varchar', length: 128, nullable: true })
  category: string | null;

  /**
   * Form tags
   */
  @Column({ name: 'tags', type: 'jsonb', nullable: true })
  tags: string[] | null;

  /**
   * Permissions configuration (JSON: view, edit, submit permissions)
   */
  @Column({ name: 'permissions_config', type: 'jsonb', nullable: true })
  permissionsConfig: Record<string, any> | null;

  /**
   * Workflow ID (if integrated with workflow engine)
   */
  @Column({ name: 'workflow_id', type: 'bigint', nullable: true })
  workflowId: number | null;

  /**
   * Notification configuration (JSON: email notifications, webhooks)
   */
  @Column({ name: 'notification_config', type: 'jsonb', nullable: true })
  notificationConfig: Record<string, any> | null;

  /**
   * Form settings (JSON: theme, branding, redirect URLs)
   */
  @Column({ name: 'form_settings', type: 'jsonb', nullable: true })
  formSettings: Record<string, any> | null;

  /**
   * Form metadata (JSONB for additional flexible data)
   */
  @Column({ name: 'form_metadata', type: 'jsonb', nullable: true })
  formMetadata: Record<string, any> | null;

  /**
   * Form responses
   */
  @OneToMany(() => FormResponse, (response) => response.formDefinition, {
    cascade: false,
    lazy: true,
  })
  responses: Promise<FormResponse[]> | FormResponse[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
