import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Between, LessThan, MoreThan } from 'typeorm';
import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';
import { Tenant } from '../../admin/entities/tenant.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';

/**
 * Subscription Repository
 * Provides custom queries for subscription operations
 */
@Injectable()
export class SubscriptionRepository extends Repository<Subscription> {
  constructor(private dataSource: DataSource) {
    super(Subscription, dataSource.createEntityManager());
  }

  /**
   * Find subscription by ID
   * Includes tenant and plan relationships
   */
  async findById(id: number): Promise<Subscription | null> {
    return this.findOne({
      where: { id },
      relations: ['tenant', 'plan'],
    });
  }

  /**
   * Find active subscription for a tenant
   * Returns the most recent active subscription
   */
  async findActiveByTenantId(tenantId: number): Promise<Subscription | null> {
    return this.findOne({
      where: {
        tenantId,
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['tenant', 'plan'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find subscription by tenant ID (any status)
   * Returns the most recent subscription
   */
  async findByTenantId(tenantId: number): Promise<Subscription | null> {
    return this.findOne({
      where: {
        tenantId,
      },
      relations: ['tenant', 'plan'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find all subscriptions for a tenant
   */
  async findAllByTenantId(tenantId: number): Promise<Subscription[]> {
    return this.find({
      where: {
        tenantId,
      },
      relations: ['tenant', 'plan'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find subscription by payment gateway subscription ID
   */
  async findByPaymentGatewayId(
    paymentGatewaySubscriptionId: string,
  ): Promise<Subscription | null> {
    return this.findOne({
      where: {
        paymentGatewaySubscriptionId,
      },
      relations: ['tenant', 'plan'],
    });
  }

  /**
   * Find subscriptions by status
   */
  async findByStatus(status: SubscriptionStatus): Promise<Subscription[]> {
    return this.find({
      where: {
        status,
      },
      relations: ['tenant', 'plan'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find subscriptions by plan ID
   */
  async findByPlanId(planId: number): Promise<Subscription[]> {
    return this.find({
      where: {
        planId,
      },
      relations: ['tenant', 'plan'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find active subscriptions by plan ID
   */
  async findActiveByPlanId(planId: number): Promise<Subscription[]> {
    return this.find({
      where: {
        planId,
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['tenant', 'plan'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find subscriptions expiring within a date range
   */
  async findExpiringBetween(startDate: Date, endDate: Date): Promise<Subscription[]> {
    return this.find({
      where: {
        currentPeriodEnd: Between(startDate, endDate),
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['tenant', 'plan'],
      order: {
        currentPeriodEnd: 'ASC',
      },
    });
  }

  /**
   * Find subscriptions expiring soon (within N days)
   */
  async findExpiringSoon(days: number): Promise<Subscription[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return this.findExpiringBetween(now, futureDate);
  }

  /**
   * Find expired subscriptions
   */
  async findExpired(): Promise<Subscription[]> {
    const now = new Date();
    return this.find({
      where: {
        currentPeriodEnd: LessThan(now),
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['tenant', 'plan'],
      order: {
        currentPeriodEnd: 'ASC',
      },
    });
  }

  /**
   * Find subscriptions in grace period
   */
  async findInGracePeriod(): Promise<Subscription[]> {
    const now = new Date();
    return this.find({
      where: {
        gracePeriodEnd: MoreThan(now),
        status: SubscriptionStatus.PAST_DUE,
      },
      relations: ['tenant', 'plan'],
      order: {
        gracePeriodEnd: 'ASC',
      },
    });
  }

  /**
   * Find subscriptions ending grace period soon (within N days)
   */
  async findGracePeriodEndingSoon(days: number): Promise<Subscription[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return this.createQueryBuilder('subscription')
      .where('subscription.gracePeriodEnd IS NOT NULL')
      .andWhere('subscription.gracePeriodEnd >= :now', { now })
      .andWhere('subscription.gracePeriodEnd <= :futureDate', { futureDate })
      .andWhere('subscription.status = :status', { status: SubscriptionStatus.PAST_DUE })
      .leftJoinAndSelect('subscription.tenant', 'tenant')
      .leftJoinAndSelect('subscription.plan', 'plan')
      .orderBy('subscription.gracePeriodEnd', 'ASC')
      .getMany();
  }

  /**
   * Find subscriptions in trial period
   */
  async findInTrial(): Promise<Subscription[]> {
    const now = new Date();
    return this.find({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEnd: MoreThan(now),
      },
      relations: ['tenant', 'plan'],
      order: {
        trialEnd: 'ASC',
      },
    });
  }

  /**
   * Find subscriptions with trials ending soon (within N days)
   */
  async findTrialsEndingSoon(days: number): Promise<Subscription[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return this.createQueryBuilder('subscription')
      .where('subscription.trialEnd IS NOT NULL')
      .andWhere('subscription.trialEnd >= :now', { now })
      .andWhere('subscription.trialEnd <= :futureDate', { futureDate })
      .andWhere('subscription.status = :status', { status: SubscriptionStatus.TRIAL })
      .leftJoinAndSelect('subscription.tenant', 'tenant')
      .leftJoinAndSelect('subscription.plan', 'plan')
      .orderBy('subscription.trialEnd', 'ASC')
      .getMany();
  }

  /**
   * Find subscriptions scheduled to cancel at period end
   */
  async findScheduledToCancel(): Promise<Subscription[]> {
    return this.find({
      where: {
        cancelAtPeriodEnd: true,
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['tenant', 'plan'],
      order: {
        currentPeriodEnd: 'ASC',
      },
    });
  }

  /**
   * Find canceled subscriptions
   */
  async findCanceled(): Promise<Subscription[]> {
    return this.find({
      where: {
        status: SubscriptionStatus.CANCELED,
      },
      relations: ['tenant', 'plan'],
      order: {
        canceledAt: 'DESC',
      },
    });
  }

  /**
   * Find past due subscriptions
   */
  async findPastDue(): Promise<Subscription[]> {
    return this.find({
      where: {
        status: SubscriptionStatus.PAST_DUE,
      },
      relations: ['tenant', 'plan'],
      order: {
        currentPeriodEnd: 'ASC',
      },
    });
  }

  /**
   * Find suspended subscriptions
   */
  async findSuspended(): Promise<Subscription[]> {
    return this.find({
      where: {
        status: SubscriptionStatus.SUSPENDED,
      },
      relations: ['tenant', 'plan'],
      order: {
        updatedAt: 'DESC',
      },
    });
  }

  /**
   * Count active subscriptions
   */
  async countActive(): Promise<number> {
    return this.count({
      where: {
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  /**
   * Count subscriptions by status
   */
  async countByStatus(status: SubscriptionStatus): Promise<number> {
    return this.count({
      where: {
        status,
      },
    });
  }

  /**
   * Count subscriptions by plan
   */
  async countByPlan(planId: number): Promise<number> {
    return this.count({
      where: {
        planId,
      },
    });
  }

  /**
   * Count active subscriptions by plan
   */
  async countActiveByPlan(planId: number): Promise<number> {
    return this.count({
      where: {
        planId,
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  /**
   * Find subscriptions with pagination
   */
  async findWithPagination(
    page: number,
    limit: number,
    filters?: {
      status?: SubscriptionStatus;
      tenantId?: number;
      planId?: number;
    },
  ): Promise<{ subscriptions: Subscription[]; total: number }> {
    const queryBuilder = this.createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.tenant', 'tenant')
      .leftJoinAndSelect('subscription.plan', 'plan');

    if (filters?.status) {
      queryBuilder.andWhere('subscription.status = :status', { status: filters.status });
    }

    if (filters?.tenantId) {
      queryBuilder.andWhere('subscription.tenantId = :tenantId', { tenantId: filters.tenantId });
    }

    if (filters?.planId) {
      queryBuilder.andWhere('subscription.planId = :planId', { planId: filters.planId });
    }

    queryBuilder
      .orderBy('subscription.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [subscriptions, total] = await queryBuilder.getManyAndCount();

    return { subscriptions, total };
  }

  /**
   * Search subscriptions by tenant name or key
   */
  async search(searchTerm: string): Promise<Subscription[]> {
    return this.createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.tenant', 'tenant')
      .leftJoinAndSelect('subscription.plan', 'plan')
      .where(
        '(LOWER(tenant.name) LIKE LOWER(:searchTerm) OR LOWER(tenant.tenantKey) LIKE LOWER(:searchTerm))',
        { searchTerm: `%${searchTerm.trim()}%` },
      )
      .orderBy('subscription.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Update subscription status
   */
  async updateStatus(id: number, status: SubscriptionStatus): Promise<void> {
    await this.update(id, {
      status,
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(id: number, cancelAtPeriodEnd = false): Promise<void> {
    const updateData: any = {
      cancelAtPeriodEnd,
    };

    if (!cancelAtPeriodEnd) {
      updateData.status = SubscriptionStatus.CANCELED;
      updateData.canceledAt = new Date();
    }

    await this.update(id, updateData);
  }

  /**
   * Reactivate canceled subscription
   */
  async reactivateSubscription(id: number): Promise<void> {
    await this.update(id, {
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    });
  }

  /**
   * Update billing period
   */
  async updateBillingPeriod(
    id: number,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
  ): Promise<void> {
    await this.update(id, {
      currentPeriodStart,
      currentPeriodEnd,
    });
  }

  /**
   * Set grace period
   */
  async setGracePeriod(id: number, gracePeriodEnd: Date): Promise<void> {
    await this.update(id, {
      gracePeriodEnd,
      status: SubscriptionStatus.PAST_DUE,
    });
  }

  /**
   * Clear grace period
   */
  async clearGracePeriod(id: number): Promise<void> {
    await this.update(id, {
      gracePeriodEnd: null,
    });
  }

  /**
   * Update payment gateway information
   */
  async updatePaymentGateway(
    id: number,
    paymentGateway: string,
    paymentGatewaySubscriptionId: string,
    paymentMethodId?: string,
  ): Promise<void> {
    const updateData: any = {
      paymentGateway,
      paymentGatewaySubscriptionId,
    };

    if (paymentMethodId) {
      updateData.paymentMethodId = paymentMethodId;
    }

    await this.update(id, updateData);
  }
}


