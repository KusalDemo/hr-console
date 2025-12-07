import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between, LessThanOrEqual } from 'typeorm';
import { Notification, NotificationStatus, NotificationPriority } from '../entities';

@Injectable()
export class NotificationRepository extends Repository<Notification> {
  constructor(private dataSource: DataSource) {
    super(Notification, dataSource.createEntityManager());
  }

  /**
   * Find notifications for user
   */
  async findByUser(
    userId: number,
    options?: {
      status?: NotificationStatus;
      channel?: string;
      category?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<Notification[]> {
    const queryBuilder = this.createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (options?.status) {
      queryBuilder.andWhere('notification.status = :status', { status: options.status });
    }

    if (options?.channel) {
      queryBuilder.andWhere('notification.channel = :channel', { channel: options.channel });
    }

    if (options?.category) {
      queryBuilder.andWhere('notification.category = :category', { category: options.category });
    }

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Find unread notifications for user
   */
  async findUnreadByUser(userId: number, limit?: number): Promise<Notification[]> {
    const queryBuilder = this.createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.readAt IS NULL')
      .andWhere('notification.channel = :channel', { channel: 'IN_APP' })
      .orderBy('notification.createdAt', 'DESC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return queryBuilder.getMany();
  }

  /**
   * Find pending notifications (for delivery)
   */
  async findPending(limit?: number): Promise<Notification[]> {
    const queryBuilder = this.createQueryBuilder('notification')
      .where('notification.status = :status', { status: NotificationStatus.PENDING })
      .andWhere(
        '(notification.scheduledAt IS NULL OR notification.scheduledAt <= :now)',
        { now: new Date() },
      )
      .orderBy('notification.priority', 'DESC')
      .addOrderBy('notification.createdAt', 'ASC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return queryBuilder.getMany();
  }

  /**
   * Find failed notifications that can be retried
   */
  async findRetryable(limit?: number): Promise<Notification[]> {
    const queryBuilder = this.createQueryBuilder('notification')
      .where('notification.status = :status', { status: NotificationStatus.FAILED })
      .andWhere('notification.deliveryAttempts < notification.maxDeliveryAttempts')
      .andWhere(
        '(notification.nextRetryAt IS NULL OR notification.nextRetryAt <= :now)',
        { now: new Date() },
      )
      .orderBy('notification.priority', 'DESC')
      .addOrderBy('notification.createdAt', 'ASC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return queryBuilder.getMany();
  }

  /**
   * Count unread notifications for user
   */
  async countUnreadByUser(userId: number): Promise<number> {
    return this.count({
      where: {
        userId,
        readAt: null,
        channel: 'IN_APP',
      },
    });
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(userId: number, notificationIds?: number[]): Promise<void> {
    const queryBuilder = this.createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('userId = :userId', { userId })
      .andWhere('readAt IS NULL')
      .andWhere('channel = :channel', { channel: 'IN_APP' });

    if (notificationIds && notificationIds.length > 0) {
      queryBuilder.andWhere('id IN (:...ids)', { ids: notificationIds });
    }

    await queryBuilder.execute();
  }

  /**
   * Find notifications by date range
   */
  async findByDateRange(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<Notification[]> {
    return this.find({
      where: {
        userId,
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find notifications by related entity
   */
  async findByRelatedEntity(
    relatedEntityType: string,
    relatedEntityId: number,
  ): Promise<Notification[]> {
    return this.find({
      where: {
        relatedEntityType,
        relatedEntityId,
      },
      order: { createdAt: 'DESC' },
    });
  }
}
