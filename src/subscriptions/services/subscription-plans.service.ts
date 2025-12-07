import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SubscriptionPlanRepository } from '../repositories/subscription-plan.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import {
  SubscriptionPlan,
  BillingCycle,
  SubscriptionPlanFeatures,
} from '../entities/subscription-plan.entity';
import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';

/**
 * Plan Comparison Result
 */
export interface PlanComparisonResult {
  currentPlan: SubscriptionPlan;
  targetPlan: SubscriptionPlan;
  isUpgrade: boolean;
  isDowngrade: boolean;
  priceDifference: number;
  featureChanges: {
    added: string[];
    removed: string[];
    changed: Array<{
      feature: string;
      oldValue: any;
      newValue: any;
    }>;
  };
  limitChanges: {
    users: { old: number | null; new: number | null; change: 'increase' | 'decrease' | 'same' };
    organizations: {
      old: number | null;
      new: number | null;
      change: 'increase' | 'decrease' | 'same';
    };
    storage: { old: number | null; new: number | null; change: 'increase' | 'decrease' | 'same' };
  };
  proratedAmount?: number;
  effectiveDate?: Date;
}

/**
 * Plan Upgrade/Downgrade Result
 */
export interface PlanChangeResult {
  success: boolean;
  subscription: Subscription;
  previousPlan: SubscriptionPlan;
  newPlan: SubscriptionPlan;
  proratedAmount?: number;
  message: string;
  errors?: string[];
}

/**
 * Subscription Plan Service
 *
 * Provides business logic for subscription plan operations:
 * - List available plans
 * - Get plan details
 * - Plan feature comparison
 * - Plan upgrade/downgrade logic
 */
@Injectable()
export class SubscriptionPlansService {
  private readonly logger = new Logger(SubscriptionPlansService.name);

  constructor(
    private readonly subscriptionPlanRepository: SubscriptionPlanRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  /**
   * List all available plans
   *
   * @param includeInactive - Include inactive plans (default: false)
   * @param billingCycle - Filter by billing cycle (optional)
   * @returns List of subscription plans
   */
  async listPlans(
    includeInactive: boolean = false,
    billingCycle?: BillingCycle,
  ): Promise<SubscriptionPlan[]> {
    if (billingCycle) {
      return this.subscriptionPlanRepository.findByBillingCycle(billingCycle, includeInactive);
    }

    return includeInactive
      ? this.subscriptionPlanRepository.findAll()
      : this.subscriptionPlanRepository.findAllActive();
  }

  /**
   * Get plan by ID
   *
   * @param id - Plan ID
   * @param includeInactive - Include inactive plans (default: false)
   * @returns Plan details
   */
  async getPlanById(id: number, includeInactive: boolean = false): Promise<SubscriptionPlan> {
    const plan = includeInactive
      ? await this.subscriptionPlanRepository.findByIdIncludeInactive(id)
      : await this.subscriptionPlanRepository.findById(id);

    if (!plan) {
      throw new NotFoundException('Subscription Plan', id.toString());
    }

    return plan;
  }

  /**
   * Get plan by plan key
   *
   * @param planKey - Plan key
   * @param includeInactive - Include inactive plans (default: false)
   * @returns Plan details
   */
  async getPlanByKey(planKey: string, includeInactive: boolean = false): Promise<SubscriptionPlan> {
    const plan = await this.subscriptionPlanRepository.findByPlanKey(planKey, includeInactive);

    if (!plan) {
      throw new NotFoundException('Subscription Plan', planKey);
    }

    return plan;
  }

  /**
   * Get default plan
   *
   * @returns Default plan or null
   */
  async getDefaultPlan(): Promise<SubscriptionPlan | null> {
    return this.subscriptionPlanRepository.findDefaultPlan();
  }

  /**
   * Compare two plans
   *
   * @param currentPlanId - Current plan ID
   * @param targetPlanId - Target plan ID
   * @returns Plan comparison result
   */
  async comparePlans(currentPlanId: number, targetPlanId: number): Promise<PlanComparisonResult> {
    const currentPlan = await this.getPlanById(currentPlanId);
    const targetPlan = await this.getPlanById(targetPlanId);

    if (currentPlan.id === targetPlan.id) {
      throw new BadRequestException('Cannot compare plan to itself');
    }

    const priceDifference = targetPlan.price - currentPlan.price;
    const isUpgrade = priceDifference > 0;
    const isDowngrade = priceDifference < 0;

    // Compare features
    const featureChanges = this.compareFeatures(currentPlan.features, targetPlan.features);

    // Compare limits
    const limitChanges = {
      users: this.compareLimit(currentPlan.maxUsers, targetPlan.maxUsers),
      organizations: this.compareLimit(currentPlan.maxOrganizations, targetPlan.maxOrganizations),
      storage: this.compareLimit(currentPlan.maxStorageGb, targetPlan.maxStorageGb),
    };

    return {
      currentPlan,
      targetPlan,
      isUpgrade,
      isDowngrade,
      priceDifference,
      featureChanges,
      limitChanges,
    };
  }

  /**
   * Compare current subscription plan with target plan
   *
   * @param subscriptionId - Subscription ID
   * @param targetPlanId - Target plan ID
   * @returns Plan comparison result
   */
  async compareSubscriptionPlan(
    subscriptionId: number,
    targetPlanId: number,
  ): Promise<PlanComparisonResult> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription', subscriptionId.toString());
    }

    const currentPlan = subscription.plan;
    if (!currentPlan) {
      throw new NotFoundException('Subscription Plan', subscription.planId.toString());
    }

    const targetPlan = await this.getPlanById(targetPlanId);

    if (currentPlan.id === targetPlan.id) {
      throw new BadRequestException('Subscription is already on this plan');
    }

    const comparison = await this.comparePlans(currentPlan.id, targetPlan.id);

    // Calculate prorated amount if applicable
    if (
      subscription.status === SubscriptionStatus.ACTIVE ||
      subscription.status === SubscriptionStatus.TRIAL
    ) {
      comparison.proratedAmount = this.calculateProratedAmount(
        subscription,
        currentPlan,
        targetPlan,
      );
      comparison.effectiveDate = new Date(); // Immediate change
    }

    return comparison;
  }

  /**
   * Upgrade subscription to a new plan
   *
   * @param subscriptionId - Subscription ID
   * @param newPlanId - New plan ID
   * @param immediate - Whether to change immediately or at period end (default: true)
   * @returns Plan change result
   */
  async upgradePlan(
    subscriptionId: number,
    newPlanId: number,
    immediate: boolean = true,
  ): Promise<PlanChangeResult> {
    return this.changePlan(subscriptionId, newPlanId, immediate, 'upgrade');
  }

  /**
   * Downgrade subscription to a new plan
   *
   * @param subscriptionId - Subscription ID
   * @param newPlanId - New plan ID
   * @param immediate - Whether to change immediately or at period end (default: false)
   * @returns Plan change result
   */
  async downgradePlan(
    subscriptionId: number,
    newPlanId: number,
    immediate: boolean = false,
  ): Promise<PlanChangeResult> {
    return this.changePlan(subscriptionId, newPlanId, immediate, 'downgrade');
  }

  /**
   * Change subscription plan
   *
   * @param subscriptionId - Subscription ID
   * @param newPlanId - New plan ID
   * @param immediate - Whether to change immediately or at period end
   * @param changeType - Type of change (upgrade/downgrade)
   * @returns Plan change result
   */
  private async changePlan(
    subscriptionId: number,
    newPlanId: number,
    immediate: boolean,
    changeType: 'upgrade' | 'downgrade',
  ): Promise<PlanChangeResult> {
    this.logger.log(
      `${changeType}ing subscription ID: ${subscriptionId} to plan ID: ${newPlanId} (immediate: ${immediate})`,
    );

    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundException('Subscription', subscriptionId.toString());
    }

    if (!subscription.isActive() && !subscription.isTrial()) {
      throw new BadRequestException('Subscription must be active or in trial to change plan');
    }

    const currentPlan = subscription.plan;
    if (!currentPlan) {
      throw new NotFoundException('Subscription Plan', subscription.planId.toString());
    }

    const newPlan = await this.getPlanById(newPlanId);
    if (!newPlan.isActive) {
      throw new BadRequestException('Target plan is not active');
    }

    if (currentPlan.id === newPlan.id) {
      throw new BadRequestException('Subscription is already on this plan');
    }

    try {
      // Calculate prorated amount if immediate change
      let proratedAmount: number | undefined;
      if (immediate) {
        proratedAmount = this.calculateProratedAmount(subscription, currentPlan, newPlan);
      }

      // Update subscription plan
      await this.subscriptionRepository.update(subscription.id, {
        planId: newPlan.id,
        amount: immediate ? newPlan.price : subscription.amount,
        currency: newPlan.currency,
        billingCycle: newPlan.billingCycle,
      });

      // If immediate change, update billing period
      if (immediate) {
        const now = new Date();
        const { currentPeriodStart, currentPeriodEnd } = this.calculateBillingPeriod(
          now,
          newPlan.billingCycle,
          newPlan.billingInterval,
        );

        await this.subscriptionRepository.updateBillingPeriod(
          subscription.id,
          currentPeriodStart,
          currentPeriodEnd,
        );
      }

      // Update metadata
      const metadata = subscription.metadata || {};
      metadata.planChangeHistory = metadata.planChangeHistory || [];
      metadata.planChangeHistory.push({
        date: new Date().toISOString(),
        fromPlanId: currentPlan.id,
        fromPlanName: currentPlan.planName,
        toPlanId: newPlan.id,
        toPlanName: newPlan.planName,
        changeType,
        immediate,
        proratedAmount,
      });
      metadata.lastPlanChangeDate = new Date().toISOString();

      await this.subscriptionRepository.update(subscription.id, { metadata });

      // Fetch updated subscription
      const updatedSubscription = await this.subscriptionRepository.findById(subscriptionId);
      if (!updatedSubscription) {
        throw new NotFoundException('Subscription', subscriptionId.toString());
      }

      this.logger.log(
        `Successfully ${changeType}d subscription ID: ${subscriptionId} to plan: ${newPlan.planName}`,
      );

      return {
        success: true,
        subscription: updatedSubscription,
        previousPlan: currentPlan,
        newPlan,
        proratedAmount,
        message: `Plan ${changeType} successful`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to ${changeType} subscription ID: ${subscriptionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      return {
        success: false,
        subscription,
        previousPlan: currentPlan,
        newPlan,
        message: `Plan ${changeType} failed: ${error instanceof Error ? error.message : String(error)}`,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Compare features between two plans
   */
  private compareFeatures(
    currentFeatures: SubscriptionPlanFeatures | null,
    targetFeatures: SubscriptionPlanFeatures | null,
  ): {
    added: string[];
    removed: string[];
    changed: Array<{ feature: string; oldValue: any; newValue: any }>;
  } {
    const added: string[] = [];
    const removed: string[] = [];
    const changed: Array<{ feature: string; oldValue: any; newValue: any }> = [];

    const current = currentFeatures || {};
    const target = targetFeatures || {};

    // Get all feature keys
    const allKeys = new Set([...Object.keys(current), ...Object.keys(target)]);

    for (const key of allKeys) {
      const currentValue = current[key];
      const targetValue = target[key];

      if (currentValue === undefined && targetValue !== undefined) {
        added.push(key);
      } else if (currentValue !== undefined && targetValue === undefined) {
        removed.push(key);
      } else if (currentValue !== targetValue) {
        changed.push({
          feature: key,
          oldValue: currentValue,
          newValue: targetValue,
        });
      }
    }

    return { added, removed, changed };
  }

  /**
   * Compare limit values
   */
  private compareLimit(
    oldLimit: number | null,
    newLimit: number | null,
  ): {
    old: number | null;
    new: number | null;
    change: 'increase' | 'decrease' | 'same';
  } {
    // Handle unlimited (null) as Infinity for comparison
    const oldValue = oldLimit === null ? Infinity : oldLimit;
    const newValue = newLimit === null ? Infinity : newLimit;

    let change: 'increase' | 'decrease' | 'same';
    if (newValue > oldValue) {
      change = 'increase';
    } else if (newValue < oldValue) {
      change = 'decrease';
    } else {
      change = 'same';
    }

    return {
      old: oldLimit,
      new: newLimit,
      change,
    };
  }

  /**
   * Calculate prorated amount for plan change
   */
  private calculateProratedAmount(
    subscription: Subscription,
    currentPlan: SubscriptionPlan,
    newPlan: SubscriptionPlan,
  ): number {
    const now = new Date();
    const periodStart = subscription.currentPeriodStart;
    const periodEnd = subscription.currentPeriodEnd;

    // Calculate days used and days remaining
    const totalDays = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysUsed = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = totalDays - daysUsed;

    // Calculate prorated amounts
    const currentPlanDailyRate = currentPlan.price / totalDays;
    const newPlanDailyRate = newPlan.price / totalDays;

    const creditForUnusedDays = currentPlanDailyRate * daysRemaining;
    const chargeForRemainingDays = newPlanDailyRate * daysRemaining;

    // Prorated amount is the difference
    const proratedAmount = chargeForRemainingDays - creditForUnusedDays;

    return Math.max(0, Math.round(proratedAmount * 100) / 100); // Round to 2 decimal places, minimum 0
  }

  /**
   * Calculate billing period dates
   */
  private calculateBillingPeriod(
    startDate: Date,
    billingCycle: BillingCycle,
    interval: number = 1,
  ): { currentPeriodStart: Date; currentPeriodEnd: Date } {
    const currentPeriodStart = new Date(startDate);
    const currentPeriodEnd = new Date(startDate);

    switch (billingCycle) {
      case BillingCycle.MONTHLY:
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + interval);
        break;
      case BillingCycle.QUARTERLY:
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + interval * 3);
        break;
      case BillingCycle.YEARLY:
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + interval);
        break;
      default:
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + interval);
    }

    return { currentPeriodStart, currentPeriodEnd };
  }

  /**
   * Get plans suitable for upgrade from current plan
   *
   * @param currentPlanId - Current plan ID
   * @returns List of upgrade plans
   */
  async getUpgradePlans(currentPlanId: number): Promise<SubscriptionPlan[]> {
    const currentPlan = await this.getPlanById(currentPlanId);
    const allPlans = await this.subscriptionPlanRepository.findAllActive();

    return allPlans.filter((plan) => plan.price > currentPlan.price && plan.id !== currentPlan.id);
  }

  /**
   * Get plans suitable for downgrade from current plan
   *
   * @param currentPlanId - Current plan ID
   * @returns List of downgrade plans
   */
  async getDowngradePlans(currentPlanId: number): Promise<SubscriptionPlan[]> {
    const currentPlan = await this.getPlanById(currentPlanId);
    const allPlans = await this.subscriptionPlanRepository.findAllActive();

    return allPlans.filter((plan) => plan.price < currentPlan.price && plan.id !== currentPlan.id);
  }

  /**
   * Create a new subscription plan
   *
   * @param createDto - Plan creation data
   * @param userId - User ID creating the plan
   * @returns Created plan
   */
  async createPlan(createDto: CreatePlanDto, userId: number): Promise<SubscriptionPlan> {
    // Check if plan key already exists
    const existingPlan = await this.subscriptionPlanRepository.findByPlanKey(
      createDto.planKey,
      true, // Include inactive
    );

    if (existingPlan) {
      throw new BadRequestException(`Plan with key '${createDto.planKey}' already exists`);
    }

    // If setting as default, unset other default plans
    if (createDto.isDefault) {
      await this.unsetDefaultPlans();
    }

    const plan = this.subscriptionPlanRepository.create({
      planKey: createDto.planKey.toLowerCase().trim(),
      planName: createDto.planName,
      description: createDto.description || null,
      price: createDto.price,
      currency: createDto.currency || 'USD',
      billingCycle: createDto.billingCycle || BillingCycle.MONTHLY,
      billingInterval: createDto.billingInterval || 1,
      maxUsers: createDto.maxUsers ?? null,
      maxOrganizations: createDto.maxOrganizations ?? null,
      maxStorageGb: createDto.maxStorageGb ?? null,
      features: createDto.features || null,
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
      isDefault: createDto.isDefault || false,
      sortOrder: createDto.sortOrder || 0,
      createdBy: userId,
      updatedBy: userId,
    });

    const savedPlan = await this.subscriptionPlanRepository.save(plan);
    this.logger.log(`Created subscription plan: ${savedPlan.planKey} (ID: ${savedPlan.id})`);

    return savedPlan;
  }

  /**
   * Update a subscription plan
   *
   * @param id - Plan ID
   * @param updateDto - Plan update data
   * @param userId - User ID updating the plan
   * @returns Updated plan
   */
  async updatePlan(
    id: number,
    updateDto: UpdatePlanDto,
    userId: number,
  ): Promise<SubscriptionPlan> {
    const plan = await this.getPlanById(id, true); // Include inactive

    // If setting as default, unset other default plans
    if (updateDto.isDefault && !plan.isDefault) {
      await this.unsetDefaultPlans();
    }

    // Update fields
    if (updateDto.planName !== undefined) {
      plan.planName = updateDto.planName;
    }
    if (updateDto.description !== undefined) {
      plan.description = updateDto.description;
    }
    if (updateDto.price !== undefined) {
      plan.price = updateDto.price;
    }
    if (updateDto.currency !== undefined) {
      plan.currency = updateDto.currency;
    }
    if (updateDto.billingCycle !== undefined) {
      plan.billingCycle = updateDto.billingCycle;
    }
    if (updateDto.billingInterval !== undefined) {
      plan.billingInterval = updateDto.billingInterval;
    }
    if (updateDto.maxUsers !== undefined) {
      plan.maxUsers = updateDto.maxUsers;
    }
    if (updateDto.maxOrganizations !== undefined) {
      plan.maxOrganizations = updateDto.maxOrganizations;
    }
    if (updateDto.maxStorageGb !== undefined) {
      plan.maxStorageGb = updateDto.maxStorageGb;
    }
    if (updateDto.features !== undefined) {
      plan.features = updateDto.features;
    }
    if (updateDto.isActive !== undefined) {
      plan.isActive = updateDto.isActive;
    }
    if (updateDto.isDefault !== undefined) {
      plan.isDefault = updateDto.isDefault;
    }
    if (updateDto.sortOrder !== undefined) {
      plan.sortOrder = updateDto.sortOrder;
    }

    plan.updatedBy = userId;

    const updatedPlan = await this.subscriptionPlanRepository.save(plan);
    this.logger.log(`Updated subscription plan: ${updatedPlan.planKey} (ID: ${updatedPlan.id})`);

    return updatedPlan;
  }

  /**
   * Deactivate a subscription plan (soft delete)
   *
   * @param id - Plan ID
   * @param userId - User ID deactivating the plan
   * @returns Deactivated plan
   */
  async deactivatePlan(id: number, userId: number): Promise<SubscriptionPlan> {
    const plan = await this.getPlanById(id, true); // Include inactive

    // Check if plan has active subscriptions
    const activeSubscriptions = await this.subscriptionRepository.findActiveByPlanId(id);
    if (activeSubscriptions.length > 0) {
      throw new BadRequestException(
        `Cannot deactivate plan with ${activeSubscriptions.length} active subscription(s)`,
      );
    }

    plan.isActive = false;
    plan.isDefault = false; // Cannot be default if inactive
    plan.updatedBy = userId;

    const deactivatedPlan = await this.subscriptionPlanRepository.save(plan);
    this.logger.log(
      `Deactivated subscription plan: ${deactivatedPlan.planKey} (ID: ${deactivatedPlan.id})`,
    );

    return deactivatedPlan;
  }

  /**
   * Unset all default plans
   * Private helper method
   */
  private async unsetDefaultPlans(): Promise<void> {
    const defaultPlans = await this.subscriptionPlanRepository.find({
      where: { isDefault: true },
    });

    for (const plan of defaultPlans) {
      plan.isDefault = false;
      await this.subscriptionPlanRepository.save(plan);
    }
  }
}
