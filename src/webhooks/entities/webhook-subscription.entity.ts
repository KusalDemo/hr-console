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
import { WebhookEvent } from './webhook-event.entity';

/**
 * Webhook Event Type Enum
 */
export enum WebhookEventType {
  // Employee events
  EMPLOYEE_CREATED = 'employee.created',
  EMPLOYEE_UPDATED = 'employee.updated',
  EMPLOYEE_DELETED = 'employee.deleted',
  
  // Project events
  PROJECT_CREATED = 'project.created',
  PROJECT_UPDATED = 'project.updated',
  PROJECT_DELETED = 'project.deleted',
  
  // Timesheet events
  TIMESHEET_SUBMITTED = 'timesheet.submitted',
  TIMESHEET_APPROVED = 'timesheet.approved',
  TIMESHEET_REJECTED = 'timesheet.rejected',
  
  // Leave events
  LEAVE_REQUEST_CREATED = 'leave_request.created',
  LEAVE_REQUEST_APPROVED = 'leave_request.approved',
  LEAVE_REQUEST_REJECTED = 'leave_request.rejected',
  
  // Task events
  TASK_CREATED = 'task.created',
  TASK_UPDATED = 'task.updated',
  TASK_COMPLETED = 'task.completed',
  
  // Custom events
  CUSTOM = 'custom',
}

/**
 * Webhook Subscription Status Enum
 */
export enum WebhookSubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR',
}

/**
 * Webhook Subscription Entity
 * 
 * Represents a webhook subscription configuration for a tenant/organization.
 * Supports:
 * - Event type filtering
 * - URL endpoint configuration
 * - Authentication (headers, signatures)
 * - Retry policies
 * - Dead letter queue
 */
@Entity('webhook_subscriptions')
@Index('idx_webhook_subscriptions_organization', ['organizationId'])
@Index('idx_webhook_subscriptions_status', ['status'])
@Index('idx_webhook_subscriptions_active', ['isActive'])
@Index('idx_webhook_subscriptions_key', ['subscriptionKey'], { unique: true })
export class WebhookSubscription {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique subscription key
   */
  @Column({ name: 'subscription_key', type: 'varchar', length: 128, unique: true, nullable: false })
  subscriptionKey: string;

  /**
   * Subscription name
   */
  @Column({ name: 'subscription_name', type: 'varchar', length: 255, nullable: false })
  subscriptionName: string;

  /**
   * Subscription description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Organization this subscription belongs to
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
   * Webhook URL endpoint
   */
  @Column({ name: 'webhook_url', type: 'varchar', length: 512, nullable: false })
  webhookUrl: string;

  /**
   * Event types to subscribe to (JSON array)
   */
  @Column({ name: 'event_types', type: 'jsonb', nullable: false })
  eventTypes: WebhookEventType[];

  /**
   * Event filters (JSON object for conditional filtering)
   * Example: { "employee.departmentId": [1, 2, 3] }
   */
  @Column({ name: 'event_filters', type: 'jsonb', nullable: true })
  eventFilters: Record<string, any> | null;

  /**
   * HTTP method (default: POST)
   */
  @Column({ name: 'http_method', type: 'varchar', length: 10, nullable: false, default: 'POST' })
  httpMethod: string;

  /**
   * Custom headers to include in webhook requests (JSON object)
   */
  @Column({ name: 'custom_headers', type: 'jsonb', nullable: true })
  customHeaders: Record<string, string> | null;

  /**
   * Secret key for webhook signature (HMAC)
   */
  @Column({ name: 'secret_key', type: 'varchar', length: 255, nullable: true })
  secretKey: string | null;

  /**
   * Maximum retry attempts (default: 3)
   */
  @Column({ name: 'max_retries', type: 'integer', nullable: false, default: 3 })
  maxRetries: number;

  /**
   * Retry delay in seconds (default: 60)
   */
  @Column({ name: 'retry_delay_seconds', type: 'integer', nullable: false, default: 60 })
  retryDelaySeconds: number;

  /**
   * Timeout in milliseconds (default: 30000)
   */
  @Column({ name: 'timeout_ms', type: 'integer', nullable: false, default: 30000 })
  timeoutMs: number;

  /**
   * Whether subscription is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * Subscription status
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: WebhookSubscriptionStatus.ACTIVE,
  })
  status: WebhookSubscriptionStatus;

  /**
   * Last successful delivery timestamp
   */
  @Column({ name: 'last_success_at', type: 'timestamptz', nullable: true })
  lastSuccessAt: Date | null;

  /**
   * Last failure timestamp
   */
  @Column({ name: 'last_failure_at', type: 'timestamptz', nullable: true })
  lastFailureAt: Date | null;

  /**
   * Last failure reason
   */
  @Column({ name: 'last_failure_reason', type: 'text', nullable: true })
  lastFailureReason: string | null;

  /**
   * Total successful deliveries
   */
  @Column({ name: 'success_count', type: 'bigint', nullable: false, default: 0 })
  successCount: number;

  /**
   * Total failed deliveries
   */
  @Column({ name: 'failure_count', type: 'bigint', nullable: false, default: 0 })
  failureCount: number;

  /**
   * Webhook events for this subscription
   */
  @OneToMany(() => WebhookEvent, (event) => event.subscription, {
    cascade: false,
    lazy: true,
  })
  events: Promise<WebhookEvent[]> | WebhookEvent[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;
}
