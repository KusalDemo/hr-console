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

/**
 * Notification Preference Entity
 * 
 * Stores user/tenant notification preferences:
 * - Per-channel preferences (email, SMS, push, in-app)
 * - Per-category preferences
 * - Per-template preferences
 * - Quiet hours
 * - Delivery frequency
 */
@Entity('notification_preferences')
@Index('idx_notification_preferences_user', ['userId'])
@Index('idx_notification_preferences_organization', ['organizationId'])
@Index('idx_notification_preferences_template', ['templateKey'])
@Index('idx_notification_preferences_category', ['category'])
export class NotificationPreference {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * User ID (employee ID) - null for organization-level preferences
   */
  @ManyToOne(() => Employee, {
    nullable: true,
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'user_id' })
  user: Promise<Employee | null> | Employee | null;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId: number | null;

  /**
   * Organization ID - null for user-level preferences
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
   * Template key (specific template) - null for category/global preferences
   */
  @Column({ name: 'template_key', type: 'varchar', length: 128, nullable: true })
  templateKey: string | null;

  /**
   * Category (e.g., "leave", "invoice") - null for global preferences
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  category: string | null;

  /**
   * Enable email notifications
   */
  @Column({ name: 'email_enabled', type: 'boolean', nullable: false, default: true })
  emailEnabled: boolean;

  /**
   * Enable SMS notifications
   */
  @Column({ name: 'sms_enabled', type: 'boolean', nullable: false, default: false })
  smsEnabled: boolean;

  /**
   * Enable push notifications
   */
  @Column({ name: 'push_enabled', type: 'boolean', nullable: false, default: true })
  pushEnabled: boolean;

  /**
   * Enable in-app notifications
   */
  @Column({ name: 'in_app_enabled', type: 'boolean', nullable: false, default: true })
  inAppEnabled: boolean;

  /**
   * Enable webhook notifications
   */
  @Column({ name: 'webhook_enabled', type: 'boolean', nullable: false, default: false })
  webhookEnabled: boolean;

  /**
   * Quiet hours start (HH:mm format, e.g., "22:00")
   */
  @Column({ name: 'quiet_hours_start', type: 'varchar', length: 8, nullable: true })
  quietHoursStart: string | null;

  /**
   * Quiet hours end (HH:mm format, e.g., "08:00")
   */
  @Column({ name: 'quiet_hours_end', type: 'varchar', length: 8, nullable: true })
  quietHoursEnd: string | null;

  /**
   * Timezone for quiet hours (e.g., "America/New_York")
   */
  @Column({ name: 'quiet_hours_timezone', type: 'varchar', length: 64, nullable: true })
  quietHoursTimezone: string | null;

  /**
   * Delivery frequency (IMMEDIATE, DAILY_DIGEST, WEEKLY_DIGEST)
   */
  @Column({
    name: 'delivery_frequency',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: 'IMMEDIATE',
  })
  deliveryFrequency: string;

  /**
   * Digest time (HH:mm format) for digest frequencies
   */
  @Column({ name: 'digest_time', type: 'varchar', length: 8, nullable: true })
  digestTime: string | null;

  /**
   * Whether preference is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

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
   * Check if notification should be sent based on quiet hours
   */
  isInQuietHours(date: Date = new Date()): boolean {
    if (!this.quietHoursStart || !this.quietHoursEnd) {
      return false;
    }

    // Simple implementation - can be enhanced with timezone support
    const now = date;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = this.quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = this.quietHoursEnd.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime <= endTime) {
      // Same day quiet hours (e.g., 22:00 - 08:00 next day)
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Overnight quiet hours (e.g., 22:00 - 08:00)
      return currentTime >= startTime || currentTime < endTime;
    }
  }
}
