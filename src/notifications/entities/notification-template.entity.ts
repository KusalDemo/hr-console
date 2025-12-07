import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Notification Channel Enum
 */
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
  WEBHOOK = 'WEBHOOK',
}

/**
 * Notification Template Entity
 * 
 * Stores notification templates for different channels:
 * - Email templates with subject and body
 * - SMS templates
 * - Push notification templates
 * - In-app notification templates
 * - Webhook templates
 * 
 * Supports template variables (e.g., {{userName}}, {{action}})
 */
@Entity('notification_templates')
@Index('idx_notification_templates_key', ['templateKey'], { unique: true })
@Index('idx_notification_templates_channel', ['channel'])
@Index('idx_notification_templates_active', ['isActive'])
@Index('idx_notification_templates_category', ['category'])
export class NotificationTemplate {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique template key (e.g., "leave_request_approved", "invoice_generated")
   */
  @Column({ name: 'template_key', type: 'varchar', length: 128, unique: true, nullable: false })
  templateKey: string;

  /**
   * Template name
   */
  @Column({ name: 'template_name', type: 'varchar', length: 255, nullable: false })
  templateName: string;

  /**
   * Template description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Notification channel
   */
  @Column({
    name: 'channel',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  channel: NotificationChannel;

  /**
   * Template category (e.g., "leave", "invoice", "system", "workflow")
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  category: string | null;

  /**
   * Email subject (for EMAIL channel)
   */
  @Column({ name: 'email_subject', type: 'varchar', length: 255, nullable: true })
  emailSubject: string | null;

  /**
   * Email body (HTML or plain text)
   */
  @Column({ name: 'email_body', type: 'text', nullable: true })
  emailBody: string | null;

  /**
   * SMS message body (for SMS channel)
   */
  @Column({ name: 'sms_body', type: 'varchar', length: 500, nullable: true })
  smsBody: string | null;

  /**
   * Push notification title (for PUSH channel)
   */
  @Column({ name: 'push_title', type: 'varchar', length: 255, nullable: true })
  pushTitle: string | null;

  /**
   * Push notification body (for PUSH channel)
   */
  @Column({ name: 'push_body', type: 'text', nullable: true })
  pushBody: string | null;

  /**
   * In-app notification title (for IN_APP channel)
   */
  @Column({ name: 'in_app_title', type: 'varchar', length: 255, nullable: true })
  inAppTitle: string | null;

  /**
   * In-app notification body (for IN_APP channel)
   */
  @Column({ name: 'in_app_body', type: 'text', nullable: true })
  inAppBody: string | null;

  /**
   * Webhook payload template (JSON) (for WEBHOOK channel)
   */
  @Column({ name: 'webhook_payload', type: 'jsonb', nullable: true })
  webhookPayload: Record<string, any> | null;

  /**
   * Available template variables (JSON array of variable names)
   */
  @Column({ name: 'template_variables', type: 'jsonb', nullable: true })
  templateVariables: string[] | null;

  /**
   * Default priority for notifications using this template
   */
  @Column({
    name: 'default_priority',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: 'NORMAL',
  })
  defaultPriority: string;

  /**
   * Whether template is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Whether template is system template (cannot be deleted)
   */
  @Column({ name: 'is_system', type: 'boolean', nullable: false, default: false })
  isSystem: boolean;

  /**
   * Additional metadata (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
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
