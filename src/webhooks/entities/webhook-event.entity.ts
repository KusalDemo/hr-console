import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WebhookSubscription, WebhookEventType } from './webhook-subscription.entity';

/**
 * Webhook Event Delivery Status Enum
 */
export enum WebhookEventStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  DEAD_LETTER = 'DEAD_LETTER',
}

/**
 * Webhook Event Entity
 * 
 * Represents a webhook event that needs to be delivered.
 * Tracks:
 * - Event payload
 * - Delivery attempts
 * - Delivery status
 * - Response information
 * - Retry logic
 */
@Entity('webhook_events')
@Index('idx_webhook_events_subscription', ['subscriptionId'])
@Index('idx_webhook_events_status', ['status'])
@Index('idx_webhook_events_type', ['eventType'])
@Index('idx_webhook_events_created', ['createdAt'])
@Index('idx_webhook_events_pending', ['status', 'createdAt'], {
  where: `status = 'PENDING' OR status = 'RETRYING'`,
})
export class WebhookEvent {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Webhook subscription this event belongs to
   */
  @ManyToOne(() => WebhookSubscription, (subscription) => subscription.events, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'subscription_id' })
  subscription: WebhookSubscription;

  @Column({ name: 'subscription_id', type: 'bigint', nullable: false })
  subscriptionId: number;

  /**
   * Event type
   */
  @Column({
    name: 'event_type',
    type: 'varchar',
    length: 128,
    nullable: false,
  })
  eventType: WebhookEventType;

  /**
   * Event payload (JSON)
   */
  @Column({ type: 'jsonb', nullable: false })
  payload: Record<string, any>;

  /**
   * Event metadata (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Delivery status
   */
  @Column({
    type: 'varchar',
    length: 32,
    nullable: false,
    default: WebhookEventStatus.PENDING,
  })
  status: WebhookEventStatus;

  /**
   * Number of delivery attempts
   */
  @Column({ name: 'attempt_count', type: 'integer', nullable: false, default: 0 })
  attemptCount: number;

  /**
   * Next retry timestamp
   */
  @Column({ name: 'next_retry_at', type: 'timestamptz', nullable: true })
  nextRetryAt: Date | null;

  /**
   * Last delivery attempt timestamp
   */
  @Column({ name: 'last_attempt_at', type: 'timestamptz', nullable: true })
  lastAttemptAt: Date | null;

  /**
   * Last HTTP response status code
   */
  @Column({ name: 'last_response_status', type: 'integer', nullable: true })
  lastResponseStatus: number | null;

  /**
   * Last HTTP response body
   */
  @Column({ name: 'last_response_body', type: 'text', nullable: true })
  lastResponseBody: string | null;

  /**
   * Last error message
   */
  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  /**
   * Delivered timestamp
   */
  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  /**
   * Request ID for tracking
   */
  @Column({ name: 'request_id', type: 'varchar', length: 128, nullable: true })
  requestId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;
}
