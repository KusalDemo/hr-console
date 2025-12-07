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
import { Employee } from '../../employees/entities/employee.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { NotificationTemplate } from './notification-template.entity';

/**
 * Notification Status Enum
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Notification Priority Enum
 */
export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Notification Entity
 *
 * Stores notification history and delivery tracking:
 * - Notification content
 * - Recipient information
 * - Delivery status
 * - Delivery attempts and errors
 * - Read status (for in-app)
 */
@Entity('notifications')
@Index('idx_notifications_user', ['userId'])
@Index('idx_notifications_organization', ['organizationId'])
@Index('idx_notifications_template', ['templateId'])
@Index('idx_notifications_status', ['status'])
@Index('idx_notifications_channel', ['channel'])
@Index('idx_notifications_priority', ['priority'])
@Index('idx_notifications_created', ['createdAt'])
@Index('idx_notifications_sent', ['sentAt'])
@Index('idx_notifications_read', ['readAt'])
@Index('idx_notifications_category', ['category'])
export class Notification {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Template used for this notification
   */
  @ManyToOne(() => NotificationTemplate, {
    nullable: true,
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'template_id' })
  template: Promise<NotificationTemplate | null> | NotificationTemplate | null;

  @Column({ name: 'template_id', type: 'bigint', nullable: true })
  templateId: number | null;

  /**
   * Template key (denormalized for quick access)
   */
  @Column({ name: 'template_key', type: 'varchar', length: 128, nullable: true })
  templateKey: string | null;

  /**
   * Notification channel
   */
  @Column({
    name: 'channel',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  channel: string;

  /**
   * Recipient user (employee)
   */
  @ManyToOne(() => Employee, {
    nullable: false,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'user_id' })
  user: Promise<Employee> | Employee;

  @Column({ name: 'user_id', type: 'bigint', nullable: false })
  userId: number;

  /**
   * Organization context
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
   * Notification title
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  /**
   * Notification body/content
   */
  @Column({ type: 'text', nullable: false })
  body: string;

  /**
   * Notification category
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  category: string | null;

  /**
   * Notification priority
   */
  @Column({
    name: 'priority',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  /**
   * Notification status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  /**
   * Scheduled send time (for scheduled notifications)
   */
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  /**
   * Sent at timestamp
   */
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  /**
   * Delivered at timestamp
   */
  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  /**
   * Read at timestamp (for in-app notifications)
   */
  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  /**
   * Failed at timestamp
   */
  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt: Date | null;

  /**
   * Failure reason/error message
   */
  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  /**
   * Number of delivery attempts
   */
  @Column({ name: 'delivery_attempts', type: 'integer', nullable: false, default: 0 })
  deliveryAttempts: number;

  /**
   * Maximum delivery attempts
   */
  @Column({ name: 'max_delivery_attempts', type: 'integer', nullable: false, default: 3 })
  maxDeliveryAttempts: number;

  /**
   * Next retry at timestamp
   */
  @Column({ name: 'next_retry_at', type: 'timestamptz', nullable: true })
  nextRetryAt: Date | null;

  /**
   * Recipient email (for EMAIL channel)
   */
  @Column({ name: 'recipient_email', type: 'varchar', length: 255, nullable: true })
  recipientEmail: string | null;

  /**
   * Recipient phone (for SMS channel)
   */
  @Column({ name: 'recipient_phone', type: 'varchar', length: 32, nullable: true })
  recipientPhone: string | null;

  /**
   * Webhook URL (for WEBHOOK channel)
   */
  @Column({ name: 'webhook_url', type: 'varchar', length: 512, nullable: true })
  webhookUrl: string | null;

  /**
   * Action URL (for in-app/push notifications)
   */
  @Column({ name: 'action_url', type: 'varchar', length: 512, nullable: true })
  actionUrl: string | null;

  /**
   * Action label (for in-app/push notifications)
   */
  @Column({ name: 'action_label', type: 'varchar', length: 128, nullable: true })
  actionLabel: string | null;

  /**
   * Related entity type (e.g., "LeaveRequest", "Invoice")
   */
  @Column({ name: 'related_entity_type', type: 'varchar', length: 128, nullable: true })
  relatedEntityType: string | null;

  /**
   * Related entity ID
   */
  @Column({ name: 'related_entity_id', type: 'bigint', nullable: true })
  relatedEntityId: number | null;

  /**
   * Template variables used (JSON)
   */
  @Column({ name: 'template_variables', type: 'jsonb', nullable: true })
  templateVariables: Record<string, any> | null;

  /**
   * Delivery metadata (JSON) - provider response, delivery ID, etc.
   */
  @Column({ name: 'delivery_metadata', type: 'jsonb', nullable: true })
  deliveryMetadata: Record<string, any> | null;

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

  /**
   * Check if notification is sent
   */
  isSent(): boolean {
    return this.status === NotificationStatus.SENT || this.status === NotificationStatus.DELIVERED;
  }

  /**
   * Check if notification is failed
   */
  isFailed(): boolean {
    return this.status === NotificationStatus.FAILED;
  }

  /**
   * Check if notification can be retried
   */
  canRetry(): boolean {
    return (
      this.status === NotificationStatus.FAILED && this.deliveryAttempts < this.maxDeliveryAttempts
    );
  }

  /**
   * Check if notification is read (for in-app)
   */
  isRead(): boolean {
    return this.readAt !== null;
  }
}
