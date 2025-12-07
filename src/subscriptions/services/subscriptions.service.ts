import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { SubscriptionPlanRepository } from '../repositories/subscription-plan.repository';
import { TenantRepository } from '../../admin/repositories/tenant.repository';
import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';
import { BillingCycle } from '../entities/subscription-plan.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import {
  CreateSubscriptionDto,
  CreateSubscriptionWithPlanDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
  RenewSubscriptionDto,
  SubscriptionResponseDto,
  SubscriptionDetailResponseDto,
  SubscriptionCreationResponseDto,
  SubscriptionListResponseDto,
  SubscriptionSummaryResponseDto,
} from '../dto';
import { ErrorCode } from '../../common/exceptions/business.exception';

/**
 * Subscription Service
 *
 * Provides business logic for subscription operations:
 * - Create subscription for tenant
 * - Update subscription
 * - Cancel subscription
 * - Renew subscription
 * - Get active subscription
 *
 * This service handles all subscription management operations
 * including billing cycle calculations and status management.
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionPlanRepository: SubscriptionPlanRepository,
    private readonly tenantRepository: TenantRepository,
  ) {}

  /**
   * Create a new subscription for a tenant
   *
   * @param createDto - Subscription creation data
   * @param createdBy - User ID who created the subscription (optional)
   * @returns Created subscription information
   */
  async createSubscription(
    createDto: CreateSubscriptionDto,
    createdBy?: number,
  ): Promise<SubscriptionCreationResponseDto> {
    this.logger.log(`Creating subscription for tenant ID: ${createDto.tenantId}`);

    // Validate tenant exists
    const tenant = await this.tenantRepository.findById(createDto.tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant', createDto.tenantId.toString());
    }

    // Validate plan exists and is active
    const plan = await this.subscriptionPlanRepository.findById(createDto.planId);
    if (!plan) {
      throw new NotFoundException('Subscription Plan', createDto.planId.toString());
    }
    if (!plan.isActive) {
      throw new BadRequestException('Subscription plan is not active');
    }

    // Check if tenant already has an active subscription
    const existingSubscription = await this.subscriptionRepository.findActiveByTenantId(
      createDto.tenantId,
    );
    if (existingSubscription) {
      throw new ConflictException(
        'Tenant already has an active subscription. Cancel the existing subscription before creating a new one.',
      );
    }

    // Calculate billing period dates
    const { currentPeriodStart, currentPeriodEnd } = this.calculateBillingPeriod(
      createDto.currentPeriodStart ? new Date(createDto.currentPeriodStart) : new Date(),
      plan.billingCycle,
      plan.billingInterval,
    );

    // Determine initial status
    let status = createDto.status || SubscriptionStatus.ACTIVE;
    if (createDto.trialStart && createDto.trialEnd) {
      status = SubscriptionStatus.TRIAL;
    }

    // Use plan price if amount not specified
    const amount = createDto.amount !== undefined ? createDto.amount : plan.price;
    const currency = createDto.currency || plan.currency;
    const billingCycle = createDto.billingCycle || plan.billingCycle;

    try {
      // Create subscription entity
      const subscription = this.subscriptionRepository.create({
        tenantId: createDto.tenantId,
        planId: createDto.planId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: createDto.cancelAtPeriodEnd || false,
        canceledAt: null,
        trialStart: createDto.trialStart ? new Date(createDto.trialStart) : null,
        trialEnd: createDto.trialEnd ? new Date(createDto.trialEnd) : null,
        gracePeriodEnd: createDto.gracePeriodEnd ? new Date(createDto.gracePeriodEnd) : null,
        amount,
        currency,
        billingCycle,
        paymentMethodId: createDto.paymentMethodId || null,
        paymentGateway: createDto.paymentGateway || null,
        paymentGatewaySubscriptionId: createDto.paymentGatewaySubscriptionId || null,
        metadata: createDto.metadata || null,
        createdBy: createdBy || null,
        updatedBy: createdBy || null,
      });

      // Save subscription
      const savedSubscription = await this.subscriptionRepository.save(subscription);

      // Load with relations
      const subscriptionWithRelations = await this.subscriptionRepository.findById(
        savedSubscription.id,
      );

      if (!subscriptionWithRelations) {
        throw new NotFoundException('Subscription', savedSubscription.id.toString());
      }

      this.logger.log(
        `Successfully created subscription ID: ${savedSubscription.id} for tenant ID: ${createDto.tenantId}`,
      );

      return {
        subscription: this.toSubscriptionResponse(subscriptionWithRelations),
        message: 'Subscription created successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to create subscription for tenant ID: ${createDto.tenantId}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to create subscription');
    }
  }

  /**
   * Create subscription with plan selection (simplified)
   *
   * @param createDto - Simplified subscription creation data
   * @param createdBy - User ID who created the subscription (optional)
   * @returns Created subscription information
   */
  async createSubscriptionWithPlan(
    createDto: CreateSubscriptionWithPlanDto,
    createdBy?: number,
  ): Promise<SubscriptionCreationResponseDto> {
    // Convert to full CreateSubscriptionDto
    const fullCreateDto: CreateSubscriptionDto = {
      tenantId: createDto.tenantId,
      planId: createDto.plan.planId,
      amount: createDto.amount,
      currency: createDto.currency,
      paymentMethodId: createDto.paymentMethodId,
      paymentGateway: createDto.paymentGateway,
    };

    // Handle trial period if requested
    if (createDto.startTrial && createDto.trialDays) {
      const trialStart = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + createDto.trialDays);

      fullCreateDto.trialStart = trialStart.toISOString();
      fullCreateDto.trialEnd = trialEnd.toISOString();
      fullCreateDto.status = SubscriptionStatus.TRIAL;
    }

    return this.createSubscription(fullCreateDto, createdBy);
  }

  /**
   * Update subscription
   *
   * @param id - Subscription ID
   * @param updateDto - Subscription update data
   * @param updatedBy - User ID who updated the subscription (optional)
   * @returns Updated subscription information
   */
  async updateSubscription(
    id: number,
    updateDto: UpdateSubscriptionDto,
    updatedBy?: number,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Updating subscription ID: ${id}`);

    // Find subscription
    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new NotFoundException('Subscription', id.toString());
    }

    // Validate plan if being changed
    if (updateDto.planId && updateDto.planId !== subscription.planId) {
      const plan = await this.subscriptionPlanRepository.findById(updateDto.planId);
      if (!plan) {
        throw new NotFoundException('Subscription Plan', updateDto.planId.toString());
      }
      if (!plan.isActive) {
        throw new BadRequestException('Subscription plan is not active');
      }
    }

    // Prepare update data
    const updateData: Partial<Subscription> = {
      updatedBy: updatedBy || null,
    };

    if (updateDto.planId !== undefined) {
      updateData.planId = updateDto.planId;
    }
    if (updateDto.status !== undefined) {
      updateData.status = updateDto.status;
    }
    if (updateDto.currentPeriodStart !== undefined) {
      updateData.currentPeriodStart = new Date(updateDto.currentPeriodStart);
    }
    if (updateDto.currentPeriodEnd !== undefined) {
      updateData.currentPeriodEnd = new Date(updateDto.currentPeriodEnd);
    }
    if (updateDto.cancelAtPeriodEnd !== undefined) {
      updateData.cancelAtPeriodEnd = updateDto.cancelAtPeriodEnd;
    }
    if (updateDto.trialStart !== undefined) {
      updateData.trialStart = updateDto.trialStart ? new Date(updateDto.trialStart) : null;
    }
    if (updateDto.trialEnd !== undefined) {
      updateData.trialEnd = updateDto.trialEnd ? new Date(updateDto.trialEnd) : null;
    }
    if (updateDto.gracePeriodEnd !== undefined) {
      updateData.gracePeriodEnd = updateDto.gracePeriodEnd
        ? new Date(updateDto.gracePeriodEnd)
        : null;
    }
    if (updateDto.amount !== undefined) {
      updateData.amount = updateDto.amount;
    }
    if (updateDto.currency !== undefined) {
      updateData.currency = updateDto.currency;
    }
    if (updateDto.billingCycle !== undefined) {
      updateData.billingCycle = updateDto.billingCycle;
    }
    if (updateDto.paymentMethodId !== undefined) {
      updateData.paymentMethodId = updateDto.paymentMethodId || null;
    }
    if (updateDto.paymentGateway !== undefined) {
      updateData.paymentGateway = updateDto.paymentGateway || null;
    }
    if (updateDto.paymentGatewaySubscriptionId !== undefined) {
      updateData.paymentGatewaySubscriptionId = updateDto.paymentGatewaySubscriptionId || null;
    }
    if (updateDto.metadata !== undefined) {
      updateData.metadata = updateDto.metadata || null;
    }

    try {
      // Update subscription
      await this.subscriptionRepository.update(id, updateData);

      // Fetch updated subscription with relations
      const updatedSubscription = await this.subscriptionRepository.findById(id);
      if (!updatedSubscription) {
        throw new NotFoundException('Subscription', id.toString());
      }

      this.logger.log(`Successfully updated subscription ID: ${id}`);

      return this.toSubscriptionResponse(updatedSubscription);
    } catch (error) {
      this.logger.error(
        `Failed to update subscription ID: ${id}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to update subscription');
    }
  }

  /**
   * Cancel subscription
   *
   * @param id - Subscription ID
   * @param cancelDto - Cancellation data
   * @param updatedBy - User ID who canceled the subscription (optional)
   * @returns Updated subscription information
   */
  async cancelSubscription(
    id: number,
    cancelDto: CancelSubscriptionDto,
    updatedBy?: number,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Canceling subscription ID: ${id}`);

    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new NotFoundException('Subscription', id.toString());
    }

    if (subscription.isCanceled()) {
      throw new BadRequestException('Subscription is already canceled');
    }

    try {
      await this.subscriptionRepository.cancelSubscription(
        id,
        cancelDto.cancelAtPeriodEnd !== undefined ? cancelDto.cancelAtPeriodEnd : true,
      );

      // Update metadata with cancellation reason if provided
      if (cancelDto.reason) {
        const metadata = subscription.metadata || {};
        metadata.notes = cancelDto.reason;
        await this.subscriptionRepository.update(id, {
          metadata,
          updatedBy: updatedBy || null,
        });
      }

      // Fetch updated subscription
      const updatedSubscription = await this.subscriptionRepository.findById(id);
      if (!updatedSubscription) {
        throw new NotFoundException('Subscription', id.toString());
      }

      this.logger.log(`Successfully canceled subscription ID: ${id}`);

      return this.toSubscriptionResponse(updatedSubscription);
    } catch (error) {
      this.logger.error(
        `Failed to cancel subscription ID: ${id}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to cancel subscription');
    }
  }

  /**
   * Renew subscription
   *
   * @param id - Subscription ID
   * @param renewDto - Renewal data
   * @param updatedBy - User ID who renewed the subscription (optional)
   * @returns Updated subscription information
   */
  async renewSubscription(
    id: number,
    renewDto: RenewSubscriptionDto,
    updatedBy?: number,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Renewing subscription ID: ${id}`);

    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new NotFoundException('Subscription', id.toString());
    }

    if (!subscription.canBeRenewed()) {
      throw new BadRequestException('Subscription cannot be renewed in its current state');
    }

    // Get plan (use existing or new plan if specified)
    const planId = renewDto.planId || subscription.planId;
    const plan = await this.subscriptionPlanRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException('Subscription Plan', planId.toString());
    }
    if (!plan.isActive) {
      throw new BadRequestException('Subscription plan is not active');
    }

    try {
      // Calculate new billing period
      const now = new Date();
      const { currentPeriodStart, currentPeriodEnd } = this.calculateBillingPeriod(
        now,
        plan.billingCycle,
        plan.billingInterval,
      );

      // Determine amount (use provided, plan price, or existing amount)
      const amount = renewDto.amount !== undefined ? renewDto.amount : plan.price;

      // Update subscription
      await this.subscriptionRepository.update(id, {
        planId: planId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart,
        currentPeriodEnd,
        amount,
        currency: plan.currency,
        billingCycle: plan.billingCycle,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        paymentMethodId: renewDto.paymentMethodId || subscription.paymentMethodId,
        updatedBy: updatedBy || null,
      });

      // Fetch updated subscription
      const updatedSubscription = await this.subscriptionRepository.findById(id);
      if (!updatedSubscription) {
        throw new NotFoundException('Subscription', id.toString());
      }

      this.logger.log(`Successfully renewed subscription ID: ${id}`);

      return this.toSubscriptionResponse(updatedSubscription);
    } catch (error) {
      this.logger.error(
        `Failed to renew subscription ID: ${id}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to renew subscription');
    }
  }

  /**
   * Get active subscription for a tenant
   *
   * @param tenantId - Tenant ID
   * @returns Active subscription or null
   */
  async getActiveSubscription(tenantId: number): Promise<SubscriptionResponseDto | null> {
    const subscription = await this.subscriptionRepository.findActiveByTenantId(tenantId);
    if (!subscription) {
      return null;
    }

    return this.toSubscriptionResponse(subscription);
  }

  /**
   * Get subscription by ID
   *
   * @param id - Subscription ID
   * @returns Subscription information
   */
  async getSubscriptionById(id: number): Promise<SubscriptionDetailResponseDto> {
    const subscription = await this.subscriptionRepository.findById(id);
    if (!subscription) {
      throw new NotFoundException('Subscription', id.toString());
    }

    return this.toSubscriptionDetailResponse(subscription);
  }

  /**
   * Get all subscriptions for a tenant
   *
   * @param tenantId - Tenant ID
   * @returns List of subscriptions
   */
  async getSubscriptionsByTenantId(tenantId: number): Promise<SubscriptionResponseDto[]> {
    const subscriptions = await this.subscriptionRepository.findAllByTenantId(tenantId);
    return subscriptions.map((sub) => this.toSubscriptionResponse(sub));
  }

  /**
   * Get subscriptions with pagination
   *
   * @param page - Page number
   * @param limit - Items per page
   * @param filters - Optional filters
   * @returns Paginated subscriptions
   */
  async getSubscriptionsWithPagination(
    page: number,
    limit: number,
    filters?: {
      status?: SubscriptionStatus;
      tenantId?: number;
      planId?: number;
    },
  ): Promise<SubscriptionListResponseDto> {
    const { subscriptions, total } = await this.subscriptionRepository.findWithPagination(
      page,
      limit,
      filters,
    );

    const totalPages = Math.ceil(total / limit);

    return {
      subscriptions: subscriptions.map((sub) => this.toSubscriptionResponse(sub)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Calculate billing period dates
   *
   * @param startDate - Period start date
   * @param billingCycle - Billing cycle (MONTHLY, QUARTERLY, YEARLY)
   * @param interval - Billing interval (multiplier)
   * @returns Period start and end dates
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
        // Default to monthly
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + interval);
    }

    return { currentPeriodStart, currentPeriodEnd };
  }

  /**
   * Convert Subscription entity to SubscriptionResponseDto
   */
  private toSubscriptionResponse(subscription: Subscription): SubscriptionResponseDto {
    return {
      id: subscription.id,
      tenant: {
        id: subscription.tenant.id,
        tenantKey: subscription.tenant.tenantKey,
        name: subscription.tenant.name,
        isActive: subscription.tenant.isActive,
      },
      tenantId: subscription.tenantId,
      plan: {
        id: subscription.plan.id,
        planKey: subscription.plan.planKey,
        planName: subscription.plan.planName,
        description: subscription.plan.description,
        price: subscription.plan.price,
        currency: subscription.plan.currency,
        billingCycle: subscription.plan.billingCycle,
        maxUsers: subscription.plan.maxUsers,
        maxOrganizations: subscription.plan.maxOrganizations,
        maxStorageGb: subscription.plan.maxStorageGb,
        features: subscription.plan.features,
      },
      planId: subscription.planId,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt?.toISOString() || null,
      trialStart: subscription.trialStart?.toISOString() || null,
      trialEnd: subscription.trialEnd?.toISOString() || null,
      gracePeriodEnd: subscription.gracePeriodEnd?.toISOString() || null,
      amount: subscription.amount,
      currency: subscription.currency,
      billingCycle: subscription.billingCycle,
      paymentMethodId: subscription.paymentMethodId,
      paymentGateway: subscription.paymentGateway,
      paymentGatewaySubscriptionId: subscription.paymentGatewaySubscriptionId,
      metadata: subscription.metadata,
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
      createdBy: subscription.createdBy,
      updatedBy: subscription.updatedBy,
      // Computed fields
      isActive: subscription.isActive(),
      isTrial: subscription.isTrial(),
      isExpired: subscription.isExpired(),
      isInGracePeriod: subscription.isInGracePeriod(),
      isCanceled: subscription.isCanceled(),
      daysRemainingInPeriod: subscription.getDaysRemainingInPeriod(),
      daysRemainingInTrial: subscription.getDaysRemainingInTrial(),
      daysRemainingInGracePeriod: subscription.getDaysRemainingInGracePeriod(),
    };
  }

  /**
   * Convert Subscription entity to SubscriptionDetailResponseDto
   */
  private toSubscriptionDetailResponse(subscription: Subscription): SubscriptionDetailResponseDto {
    const base = this.toSubscriptionResponse(subscription);
    return {
      ...base,
      canBeRenewed: subscription.canBeRenewed(),
      canBeCanceled: subscription.canBeCanceled(),
      willCancelAtPeriodEnd: subscription.willCancelAtPeriodEnd(),
    };
  }
}
