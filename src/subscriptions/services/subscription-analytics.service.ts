import { Injectable, Logger } from '@nestjs/common';
import { Between } from 'typeorm';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { SubscriptionPlanRepository } from '../repositories/subscription-plan.repository';
import { SubscriptionStatus } from '../entities/subscription.entity';
import { BillingCycle } from '../entities/subscription-plan.entity';

/**
 * Revenue Metrics
 * Revenue-related analytics data
 */
export interface RevenueMetrics {
  // Monthly Recurring Revenue
  mrr: number;
  // Annual Recurring Revenue
  arr: number;
  // Total revenue (all time)
  totalRevenue: number;
  // Revenue for current period
  currentPeriodRevenue: number;
  // Revenue for previous period
  previousPeriodRevenue: number;
  // Revenue growth percentage
  revenueGrowth: number;
  // Average revenue per subscription
  averageRevenuePerSubscription: number;
  // Revenue by plan
  revenueByPlan: Array<{
    planId: number;
    planKey: string;
    planName: string;
    revenue: number;
    subscriptionCount: number;
  }>;
  // Revenue by billing cycle
  revenueByBillingCycle: Array<{
    billingCycle: BillingCycle;
    revenue: number;
    subscriptionCount: number;
  }>;
}

/**
 * Subscription Metrics
 * Subscription count and status metrics
 */
export interface SubscriptionMetrics {
  // Total subscriptions
  totalSubscriptions: number;
  // Active subscriptions
  activeSubscriptions: number;
  // Trial subscriptions
  trialSubscriptions: number;
  // Past due subscriptions
  pastDueSubscriptions: number;
  // Canceled subscriptions
  canceledSubscriptions: number;
  // Expired subscriptions
  expiredSubscriptions: number;
  // Suspended subscriptions
  suspendedSubscriptions: number;
  // New subscriptions in period
  newSubscriptions: number;
  // Subscriptions by plan
  subscriptionsByPlan: Array<{
    planId: number;
    planKey: string;
    planName: string;
    count: number;
  }>;
  // Subscriptions by status
  subscriptionsByStatus: Array<{
    status: SubscriptionStatus;
    count: number;
  }>;
}

/**
 * Churn Analysis
 * Churn-related analytics
 */
export interface ChurnAnalysis {
  // Overall churn rate (percentage)
  churnRate: number;
  // Churned subscriptions in period
  churnedSubscriptions: number;
  // Total subscriptions at start of period
  subscriptionsAtStart: number;
  // Churn by plan
  churnByPlan: Array<{
    planId: number;
    planKey: string;
    planName: string;
    churnRate: number;
    churnedCount: number;
  }>;
  // Churn by billing cycle
  churnByBillingCycle: Array<{
    billingCycle: BillingCycle;
    churnRate: number;
    churnedCount: number;
  }>;
  // Average subscription duration before churn (days)
  averageSubscriptionDuration: number;
  // Churn trend (monthly)
  churnTrend: Array<{
    period: string; // YYYY-MM
    churnRate: number;
    churnedCount: number;
  }>;
}

/**
 * Growth Metrics
 * Growth-related analytics
 */
export interface GrowthMetrics {
  // Overall growth rate (percentage)
  growthRate: number;
  // New subscriptions in period
  newSubscriptions: number;
  // Previous period new subscriptions
  previousPeriodNewSubscriptions: number;
  // Growth by plan
  growthByPlan: Array<{
    planId: number;
    planKey: string;
    planName: string;
    growthRate: number;
    newSubscriptions: number;
  }>;
  // Growth trend (monthly)
  growthTrend: Array<{
    period: string; // YYYY-MM
    newSubscriptions: number;
    growthRate: number;
  }>;
  // Retention rate (percentage)
  retentionRate: number;
  // Average time to first subscription (days)
  averageTimeToSubscription: number;
}

/**
 * Subscription Analytics Service
 *
 * Provides comprehensive analytics for subscription management:
 * - Revenue tracking (MRR, ARR, revenue by period/plan)
 * - Subscription metrics (counts, status distribution)
 * - Churn analysis (churn rate, churn trends)
 * - Growth metrics (growth rate, retention, trends)
 *
 * All analytics support date range filtering and can be aggregated
 * by various dimensions (plan, billing cycle, status, etc.)
 */
@Injectable()
export class SubscriptionAnalyticsService {
  private readonly logger = new Logger(SubscriptionAnalyticsService.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionPlanRepository: SubscriptionPlanRepository,
  ) {}

  /**
   * Get revenue metrics
   *
   * @param startDate - Start date for period analysis (optional)
   * @param endDate - End date for period analysis (optional)
   * @returns Revenue metrics
   */
  async getRevenueMetrics(startDate?: Date, endDate?: Date): Promise<RevenueMetrics> {
    this.logger.log('Calculating revenue metrics');

    const now = new Date();
    const periodStart = startDate || this.getStartOfMonth(now);
    const periodEnd = endDate || now;
    const previousPeriodStart = this.subtractMonths(periodStart, 1);
    const previousPeriodEnd = periodStart;

    // Get all active subscriptions for MRR calculation
    const activeSubscriptions = await this.subscriptionRepository.findByStatus(
      SubscriptionStatus.ACTIVE,
    );

    // Calculate MRR (Monthly Recurring Revenue)
    let mrr = 0;
    let arr = 0;
    let totalRevenue = 0;
    const revenueByPlanMap = new Map<number, { revenue: number; count: number }>();
    const revenueByBillingCycleMap = new Map<BillingCycle, { revenue: number; count: number }>();

    for (const subscription of activeSubscriptions) {
      const monthlyAmount = this.getMonthlyAmount(subscription.amount, subscription.billingCycle);
      mrr += monthlyAmount;

      // Calculate ARR (Annual Recurring Revenue)
      arr += monthlyAmount * 12;

      // Track revenue by plan
      const planRevenue = revenueByPlanMap.get(subscription.planId) || { revenue: 0, count: 0 };
      planRevenue.revenue += monthlyAmount;
      planRevenue.count += 1;
      revenueByPlanMap.set(subscription.planId, planRevenue);

      // Track revenue by billing cycle
      const cycleRevenue = revenueByBillingCycleMap.get(subscription.billingCycle) || {
        revenue: 0,
        count: 0,
      };
      cycleRevenue.revenue += monthlyAmount;
      cycleRevenue.count += 1;
      revenueByBillingCycleMap.set(subscription.billingCycle, cycleRevenue);
    }

    // Get all subscriptions for total revenue calculation
    const allSubscriptions = await this.subscriptionRepository.find();
    for (const subscription of allSubscriptions) {
      const monthlyAmount = this.getMonthlyAmount(subscription.amount, subscription.billingCycle);
      totalRevenue += monthlyAmount;
    }

    // Calculate period revenue
    const currentPeriodRevenue = await this.calculatePeriodRevenue(periodStart, periodEnd);
    const previousPeriodRevenue = await this.calculatePeriodRevenue(
      previousPeriodStart,
      previousPeriodEnd,
    );

    // Calculate revenue growth
    const revenueGrowth =
      previousPeriodRevenue > 0
        ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
        : 0;

    // Calculate average revenue per subscription
    const averageRevenuePerSubscription =
      activeSubscriptions.length > 0 ? mrr / activeSubscriptions.length : 0;

    // Build revenue by plan array
    const revenueByPlan = await Promise.all(
      Array.from(revenueByPlanMap.entries()).map(async ([planId, data]) => {
        const plan = await this.subscriptionPlanRepository.findById(planId);
        return {
          planId,
          planKey: plan?.planKey || 'unknown',
          planName: plan?.planName || 'Unknown Plan',
          revenue: data.revenue,
          subscriptionCount: data.count,
        };
      }),
    );

    // Build revenue by billing cycle array
    const revenueByBillingCycle = Array.from(revenueByBillingCycleMap.entries()).map(
      ([billingCycle, data]) => ({
        billingCycle,
        revenue: data.revenue,
        subscriptionCount: data.count,
      }),
    );

    return {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      currentPeriodRevenue: Math.round(currentPeriodRevenue * 100) / 100,
      previousPeriodRevenue: Math.round(previousPeriodRevenue * 100) / 100,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      averageRevenuePerSubscription: Math.round(averageRevenuePerSubscription * 100) / 100,
      revenueByPlan,
      revenueByBillingCycle,
    };
  }

  /**
   * Get subscription metrics
   *
   * @param startDate - Start date for period analysis (optional)
   * @param endDate - End date for period analysis (optional)
   * @returns Subscription metrics
   */
  async getSubscriptionMetrics(startDate?: Date, endDate?: Date): Promise<SubscriptionMetrics> {
    this.logger.log('Calculating subscription metrics');

    const periodStart = startDate || this.getStartOfMonth(new Date());
    const periodEnd = endDate || new Date();

    // Get all subscriptions
    const allSubscriptions = await this.subscriptionRepository.find();
    const totalSubscriptions = allSubscriptions.length;

    // Count by status
    const activeSubscriptions = await this.subscriptionRepository.countByStatus(
      SubscriptionStatus.ACTIVE,
    );
    const trialSubscriptions = await this.subscriptionRepository.countByStatus(
      SubscriptionStatus.TRIAL,
    );
    const pastDueSubscriptions = await this.subscriptionRepository.countByStatus(
      SubscriptionStatus.PAST_DUE,
    );
    const canceledSubscriptions = await this.subscriptionRepository.countByStatus(
      SubscriptionStatus.CANCELED,
    );
    const expiredSubscriptions = await this.subscriptionRepository.countByStatus(
      SubscriptionStatus.EXPIRED,
    );
    const suspendedSubscriptions = await this.subscriptionRepository.countByStatus(
      SubscriptionStatus.SUSPENDED,
    );

    // Count new subscriptions in period
    const newSubscriptions = allSubscriptions.filter(
      (sub) => sub.createdAt >= periodStart && sub.createdAt <= periodEnd,
    ).length;

    // Group by plan
    const subscriptionsByPlanMap = new Map<number, number>();
    for (const subscription of allSubscriptions) {
      const count = subscriptionsByPlanMap.get(subscription.planId) || 0;
      subscriptionsByPlanMap.set(subscription.planId, count + 1);
    }

    const subscriptionsByPlan = await Promise.all(
      Array.from(subscriptionsByPlanMap.entries()).map(async ([planId, count]) => {
        const plan = await this.subscriptionPlanRepository.findById(planId);
        return {
          planId,
          planKey: plan?.planKey || 'unknown',
          planName: plan?.planName || 'Unknown Plan',
          count,
        };
      }),
    );

    // Group by status
    const subscriptionsByStatus = [
      { status: SubscriptionStatus.ACTIVE, count: activeSubscriptions },
      { status: SubscriptionStatus.TRIAL, count: trialSubscriptions },
      { status: SubscriptionStatus.PAST_DUE, count: pastDueSubscriptions },
      { status: SubscriptionStatus.CANCELED, count: canceledSubscriptions },
      { status: SubscriptionStatus.EXPIRED, count: expiredSubscriptions },
      { status: SubscriptionStatus.SUSPENDED, count: suspendedSubscriptions },
    ];

    return {
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      pastDueSubscriptions,
      canceledSubscriptions,
      expiredSubscriptions,
      suspendedSubscriptions,
      newSubscriptions,
      subscriptionsByPlan,
      subscriptionsByStatus,
    };
  }

  /**
   * Get churn analysis
   *
   * @param startDate - Start date for period analysis (optional)
   * @param endDate - End date for period analysis (optional)
   * @returns Churn analysis
   */
  async getChurnAnalysis(startDate?: Date, endDate?: Date): Promise<ChurnAnalysis> {
    this.logger.log('Calculating churn analysis');

    const now = new Date();
    const periodStart = startDate || this.subtractMonths(this.getStartOfMonth(now), 1);
    const periodEnd = endDate || now;

    // Get all subscriptions
    const allSubscriptions = await this.subscriptionRepository.find();

    // Find churned subscriptions (canceled or expired in period)
    const churnedSubscriptions = allSubscriptions.filter((sub) => {
      const isChurned =
        sub.status === SubscriptionStatus.CANCELED || sub.status === SubscriptionStatus.EXPIRED;
      if (!isChurned) return false;

      const churnedAt = sub.canceledAt || sub.currentPeriodEnd;
      return churnedAt >= periodStart && churnedAt <= periodEnd;
    });

    // Count subscriptions at start of period
    const subscriptionsAtStart = allSubscriptions.filter(
      (sub) => sub.createdAt < periodStart,
    ).length;

    // Calculate churn rate
    const churnRate =
      subscriptionsAtStart > 0 ? (churnedSubscriptions.length / subscriptionsAtStart) * 100 : 0;

    // Calculate average subscription duration before churn
    let totalDuration = 0;
    let durationCount = 0;
    for (const sub of churnedSubscriptions) {
      const duration = this.getDaysBetween(sub.createdAt, sub.canceledAt || sub.currentPeriodEnd);
      if (duration > 0) {
        totalDuration += duration;
        durationCount++;
      }
    }
    const averageSubscriptionDuration = durationCount > 0 ? totalDuration / durationCount : 0;

    // Churn by plan
    const churnByPlanMap = new Map<number, { churned: number; total: number }>();
    for (const sub of allSubscriptions) {
      const isChurned =
        sub.status === SubscriptionStatus.CANCELED || sub.status === SubscriptionStatus.EXPIRED;
      const data = churnByPlanMap.get(sub.planId) || { churned: 0, total: 0 };
      data.total += 1;
      if (isChurned) {
        data.churned += 1;
      }
      churnByPlanMap.set(sub.planId, data);
    }

    const churnByPlan = await Promise.all(
      Array.from(churnByPlanMap.entries()).map(async ([planId, data]) => {
        const plan = await this.subscriptionPlanRepository.findById(planId);
        const churnRate = data.total > 0 ? (data.churned / data.total) * 100 : 0;
        return {
          planId,
          planKey: plan?.planKey || 'unknown',
          planName: plan?.planName || 'Unknown Plan',
          churnRate: Math.round(churnRate * 100) / 100,
          churnedCount: data.churned,
        };
      }),
    );

    // Churn by billing cycle
    const churnByBillingCycleMap = new Map<BillingCycle, { churned: number; total: number }>();
    for (const sub of allSubscriptions) {
      const isChurned =
        sub.status === SubscriptionStatus.CANCELED || sub.status === SubscriptionStatus.EXPIRED;
      const data = churnByBillingCycleMap.get(sub.billingCycle) || { churned: 0, total: 0 };
      data.total += 1;
      if (isChurned) {
        data.churned += 1;
      }
      churnByBillingCycleMap.set(sub.billingCycle, data);
    }

    const churnByBillingCycle = Array.from(churnByBillingCycleMap.entries()).map(
      ([billingCycle, data]) => {
        const churnRate = data.total > 0 ? (data.churned / data.total) * 100 : 0;
        return {
          billingCycle,
          churnRate: Math.round(churnRate * 100) / 100,
          churnedCount: data.churned,
        };
      },
    );

    // Calculate churn trend (last 12 months)
    const churnTrend = await this.calculateChurnTrend(12);

    return {
      churnRate: Math.round(churnRate * 100) / 100,
      churnedSubscriptions: churnedSubscriptions.length,
      subscriptionsAtStart,
      churnByPlan,
      churnByBillingCycle,
      averageSubscriptionDuration: Math.round(averageSubscriptionDuration * 100) / 100,
      churnTrend,
    };
  }

  /**
   * Get growth metrics
   *
   * @param startDate - Start date for period analysis (optional)
   * @param endDate - End date for period analysis (optional)
   * @returns Growth metrics
   */
  async getGrowthMetrics(startDate?: Date, endDate?: Date): Promise<GrowthMetrics> {
    this.logger.log('Calculating growth metrics');

    const now = new Date();
    const periodStart = startDate || this.getStartOfMonth(now);
    const periodEnd = endDate || now;
    const previousPeriodStart = this.subtractMonths(periodStart, 1);
    const previousPeriodEnd = periodStart;

    // Get all subscriptions
    const allSubscriptions = await this.subscriptionRepository.find();

    // Count new subscriptions in current and previous periods
    const newSubscriptions = allSubscriptions.filter(
      (sub) => sub.createdAt >= periodStart && sub.createdAt <= periodEnd,
    ).length;

    const previousPeriodNewSubscriptions = allSubscriptions.filter(
      (sub) => sub.createdAt >= previousPeriodStart && sub.createdAt < previousPeriodEnd,
    ).length;

    // Calculate growth rate
    const growthRate =
      previousPeriodNewSubscriptions > 0
        ? ((newSubscriptions - previousPeriodNewSubscriptions) / previousPeriodNewSubscriptions) *
          100
        : newSubscriptions > 0
          ? 100
          : 0;

    // Growth by plan
    const growthByPlanMap = new Map<number, { current: number; previous: number }>();
    for (const sub of allSubscriptions) {
      const isCurrentPeriod = sub.createdAt >= periodStart && sub.createdAt <= periodEnd;
      const isPreviousPeriod =
        sub.createdAt >= previousPeriodStart && sub.createdAt < previousPeriodEnd;

      if (isCurrentPeriod || isPreviousPeriod) {
        const data = growthByPlanMap.get(sub.planId) || { current: 0, previous: 0 };
        if (isCurrentPeriod) {
          data.current += 1;
        }
        if (isPreviousPeriod) {
          data.previous += 1;
        }
        growthByPlanMap.set(sub.planId, data);
      }
    }

    const growthByPlan = await Promise.all(
      Array.from(growthByPlanMap.entries()).map(async ([planId, data]) => {
        const plan = await this.subscriptionPlanRepository.findById(planId);
        const planGrowthRate =
          data.previous > 0
            ? ((data.current - data.previous) / data.previous) * 100
            : data.current > 0
              ? 100
              : 0;
        return {
          planId,
          planKey: plan?.planKey || 'unknown',
          planName: plan?.planName || 'Unknown Plan',
          growthRate: Math.round(planGrowthRate * 100) / 100,
          newSubscriptions: data.current,
        };
      }),
    );

    // Calculate growth trend (last 12 months)
    const growthTrend = await this.calculateGrowthTrend(12);

    // Calculate retention rate (subscriptions created 90+ days ago that are still active)
    const ninetyDaysAgo = this.subtractDays(now, 90);
    const oldSubscriptions = allSubscriptions.filter((sub) => sub.createdAt < ninetyDaysAgo);
    const retainedSubscriptions = oldSubscriptions.filter((sub) => sub.isActive()).length;
    const retentionRate =
      oldSubscriptions.length > 0 ? (retainedSubscriptions / oldSubscriptions.length) * 100 : 0;

    // Calculate average time to first subscription (for tenants)
    // This would require tenant creation dates, so we'll set to 0 for now
    const averageTimeToSubscription = 0;

    return {
      growthRate: Math.round(growthRate * 100) / 100,
      newSubscriptions,
      previousPeriodNewSubscriptions,
      growthByPlan,
      growthTrend,
      retentionRate: Math.round(retentionRate * 100) / 100,
      averageTimeToSubscription,
    };
  }

  /**
   * Calculate revenue for a specific period
   */
  private async calculatePeriodRevenue(startDate: Date, endDate: Date): Promise<number> {
    const subscriptions = await this.subscriptionRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
    });

    let revenue = 0;
    for (const subscription of subscriptions) {
      const monthlyAmount = this.getMonthlyAmount(subscription.amount, subscription.billingCycle);
      revenue += monthlyAmount;
    }

    return revenue;
  }

  /**
   * Calculate churn trend for the last N months
   */
  private async calculateChurnTrend(
    months: number,
  ): Promise<Array<{ period: string; churnRate: number; churnedCount: number }>> {
    const trend: Array<{ period: string; churnRate: number; churnedCount: number }> = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const periodStart = this.subtractMonths(this.getStartOfMonth(now), i + 1);
      const periodEnd = this.subtractMonths(this.getStartOfMonth(now), i);

      const allSubscriptions = await this.subscriptionRepository.find();
      const subscriptionsAtStart = allSubscriptions.filter(
        (sub) => sub.createdAt < periodStart,
      ).length;

      const churnedSubscriptions = allSubscriptions.filter((sub) => {
        const isChurned =
          sub.status === SubscriptionStatus.CANCELED || sub.status === SubscriptionStatus.EXPIRED;
        if (!isChurned) return false;

        const churnedAt = sub.canceledAt || sub.currentPeriodEnd;
        return churnedAt >= periodStart && churnedAt < periodEnd;
      });

      const churnRate =
        subscriptionsAtStart > 0 ? (churnedSubscriptions.length / subscriptionsAtStart) * 100 : 0;

      const period = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;
      trend.push({
        period,
        churnRate: Math.round(churnRate * 100) / 100,
        churnedCount: churnedSubscriptions.length,
      });
    }

    return trend;
  }

  /**
   * Calculate growth trend for the last N months
   */
  private async calculateGrowthTrend(
    months: number,
  ): Promise<Array<{ period: string; newSubscriptions: number; growthRate: number }>> {
    const trend: Array<{ period: string; newSubscriptions: number; growthRate: number }> = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const periodStart = this.subtractMonths(this.getStartOfMonth(now), i);
      const periodEnd = i === 0 ? now : this.subtractMonths(this.getStartOfMonth(now), i - 1);

      const allSubscriptions = await this.subscriptionRepository.find();
      const newSubscriptions = allSubscriptions.filter(
        (sub) => sub.createdAt >= periodStart && sub.createdAt < periodEnd,
      ).length;

      // Get previous period for growth rate
      const previousPeriodStart = this.subtractMonths(periodStart, 1);
      const previousPeriodNewSubscriptions = allSubscriptions.filter(
        (sub) => sub.createdAt >= previousPeriodStart && sub.createdAt < periodStart,
      ).length;

      const growthRate =
        previousPeriodNewSubscriptions > 0
          ? ((newSubscriptions - previousPeriodNewSubscriptions) / previousPeriodNewSubscriptions) *
            100
          : newSubscriptions > 0
            ? 100
            : 0;

      const period = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;
      trend.push({
        period,
        newSubscriptions,
        growthRate: Math.round(growthRate * 100) / 100,
      });
    }

    return trend;
  }

  /**
   * Convert subscription amount to monthly amount based on billing cycle
   */
  private getMonthlyAmount(amount: number, billingCycle: BillingCycle): number {
    switch (billingCycle) {
      case BillingCycle.MONTHLY:
        return amount;
      case BillingCycle.QUARTERLY:
        return amount / 3;
      case BillingCycle.YEARLY:
        return amount / 12;
      default:
        return amount;
    }
  }

  /**
   * Get start of month for a date
   */
  private getStartOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Subtract months from a date
   */
  private subtractMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() - months);
    return result;
  }

  /**
   * Subtract days from a date
   */
  private subtractDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }

  /**
   * Get days between two dates
   */
  private getDaysBetween(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
