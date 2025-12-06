import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Not } from 'typeorm';
import { SubscriptionPlan, BillingCycle } from '../entities/subscription-plan.entity';

/**
 * Subscription Plan Repository
 * Provides custom queries for subscription plan operations
 */
@Injectable()
export class SubscriptionPlanRepository extends Repository<SubscriptionPlan> {
  constructor(private dataSource: DataSource) {
    super(SubscriptionPlan, dataSource.createEntityManager());
  }

  /**
   * Find plan by plan key (case-insensitive)
   * Only returns active plans by default
   */
  async findByPlanKey(planKey: string, includeInactive = false): Promise<SubscriptionPlan | null> {
    const where: any = {
      planKey: planKey.trim().toLowerCase(),
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    return this.findOne({
      where,
    });
  }

  /**
   * Find plan by ID
   * Only returns active plans by default
   */
  async findById(id: number, includeInactive = false): Promise<SubscriptionPlan | null> {
    const where: any = { id };

    if (!includeInactive) {
      where.isActive = true;
    }

    return this.findOne({
      where,
    });
  }

  /**
   * Find plan by ID including inactive plans
   * Used for plan management operations
   */
  async findByIdIncludeInactive(id: number): Promise<SubscriptionPlan | null> {
    return this.findById(id, true);
  }

  /**
   * Find all active plans
   * Ordered by sort order, then by name
   */
  async findAllActive(): Promise<SubscriptionPlan[]> {
    return this.find({
      where: {
        isActive: true,
      },
      order: {
        sortOrder: 'ASC',
        planName: 'ASC',
      },
    });
  }

  /**
   * Find all plans (including inactive)
   * Used for admin operations
   */
  async findAll(): Promise<SubscriptionPlan[]> {
    return this.find({
      order: {
        sortOrder: 'ASC',
        planName: 'ASC',
      },
    });
  }

  /**
   * Find the default plan
   * Returns the plan marked as default and active
   */
  async findDefaultPlan(): Promise<SubscriptionPlan | null> {
    return this.findOne({
      where: {
        isDefault: true,
        isActive: true,
      },
    });
  }

  /**
   * Find plans by billing cycle
   */
  async findByBillingCycle(
    billingCycle: BillingCycle,
    includeInactive = false,
  ): Promise<SubscriptionPlan[]> {
    const where: any = {
      billingCycle,
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    return this.find({
      where,
      order: {
        sortOrder: 'ASC',
        planName: 'ASC',
      },
    });
  }

  /**
   * Find plans within a price range
   */
  async findByPriceRange(
    minPrice: number,
    maxPrice: number,
    includeInactive = false,
  ): Promise<SubscriptionPlan[]> {
    const queryBuilder = this.createQueryBuilder('plan')
      .where('plan.price >= :minPrice', { minPrice })
      .andWhere('plan.price <= :maxPrice', { maxPrice })
      .orderBy('plan.sortOrder', 'ASC')
      .addOrderBy('plan.planName', 'ASC');

    if (!includeInactive) {
      queryBuilder.andWhere('plan.isActive = :isActive', { isActive: true });
    }

    return queryBuilder.getMany();
  }

  /**
   * Check if plan key already exists
   */
  async planKeyExists(planKey: string, excludeId?: number): Promise<boolean> {
    const where: any = {
      planKey: planKey.trim().toLowerCase(),
    };

    if (excludeId) {
      where.id = Not(excludeId);
    }

    const count = await this.count({
      where,
    });

    return count > 0;
  }

  /**
   * Activate plan
   * Sets isActive to true
   */
  async activatePlan(id: number): Promise<void> {
    await this.update(id, {
      isActive: true,
    });
  }

  /**
   * Deactivate plan
   * Sets isActive to false
   * Note: This prevents new subscriptions but existing subscriptions remain active
   */
  async deactivatePlan(id: number): Promise<void> {
    await this.update(id, {
      isActive: false,
    });
  }

  /**
   * Update plan status
   */
  async updateStatus(id: number, isActive: boolean): Promise<void> {
    await this.update(id, {
      isActive,
    });
  }

  /**
   * Set plan as default
   * Unsets any other default plan first
   */
  async setAsDefault(id: number): Promise<void> {
    // Unset any existing default plan
    await this.update(
      {
        isDefault: true,
      },
      {
        isDefault: false,
      },
    );

    // Set this plan as default
    await this.update(id, {
      isDefault: true,
    });
  }

  /**
   * Unset default plan
   */
  async unsetDefault(id: number): Promise<void> {
    await this.update(id, {
      isDefault: false,
    });
  }

  /**
   * Find plans by status
   */
  async findByStatus(isActive: boolean): Promise<SubscriptionPlan[]> {
    return this.find({
      where: {
        isActive,
      },
      order: {
        sortOrder: 'ASC',
        planName: 'ASC',
      },
    });
  }

  /**
   * Count active plans
   */
  async countActive(): Promise<number> {
    return this.count({
      where: {
        isActive: true,
      },
    });
  }

  /**
   * Count all plans
   */
  async countAll(): Promise<number> {
    return this.count();
  }

  /**
   * Find plans with pagination
   */
  async findWithPagination(
    page: number,
    limit: number,
    includeInactive = false,
  ): Promise<{ plans: SubscriptionPlan[]; total: number }> {
    const queryBuilder = this.createQueryBuilder('plan');

    if (!includeInactive) {
      queryBuilder.where('plan.isActive = :isActive', { isActive: true });
    }

    queryBuilder
      .orderBy('plan.sortOrder', 'ASC')
      .addOrderBy('plan.planName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [plans, total] = await queryBuilder.getManyAndCount();

    return { plans, total };
  }

  /**
   * Search plans by name or key
   */
  async search(
    searchTerm: string,
    includeInactive = false,
  ): Promise<SubscriptionPlan[]> {
    const queryBuilder = this.createQueryBuilder('plan')
      .where(
        '(LOWER(plan.planName) LIKE LOWER(:searchTerm) OR LOWER(plan.planKey) LIKE LOWER(:searchTerm))',
        { searchTerm: `%${searchTerm.trim()}%` },
      )
      .orderBy('plan.sortOrder', 'ASC')
      .addOrderBy('plan.planName', 'ASC');

    if (!includeInactive) {
      queryBuilder.andWhere('plan.isActive = :isActive', { isActive: true });
    }

    return queryBuilder.getMany();
  }

  /**
   * Find plans that support a specific feature
   */
  async findByFeature(
    featureKey: string,
    includeInactive = false,
  ): Promise<SubscriptionPlan[]> {
    const queryBuilder = this.createQueryBuilder('plan')
      .where(`plan.features->>'${featureKey}' = 'true'`)
      .orderBy('plan.sortOrder', 'ASC')
      .addOrderBy('plan.planName', 'ASC');

    if (!includeInactive) {
      queryBuilder.andWhere('plan.isActive = :isActive', { isActive: true });
    }

    return queryBuilder.getMany();
  }

  /**
   * Find plans with minimum user limit
   */
  async findByMinUsers(
    minUsers: number,
    includeInactive = false,
  ): Promise<SubscriptionPlan[]> {
    const queryBuilder = this.createQueryBuilder('plan')
      .where('(plan.maxUsers IS NULL OR plan.maxUsers >= :minUsers)', { minUsers })
      .orderBy('plan.sortOrder', 'ASC')
      .addOrderBy('plan.planName', 'ASC');

    if (!includeInactive) {
      queryBuilder.andWhere('plan.isActive = :isActive', { isActive: true });
    }

    return queryBuilder.getMany();
  }

  /**
   * Find plans with minimum organization limit
   */
  async findByMinOrganizations(
    minOrganizations: number,
    includeInactive = false,
  ): Promise<SubscriptionPlan[]> {
    const queryBuilder = this.createQueryBuilder('plan')
      .where(
        '(plan.maxOrganizations IS NULL OR plan.maxOrganizations >= :minOrganizations)',
        { minOrganizations },
      )
      .orderBy('plan.sortOrder', 'ASC')
      .addOrderBy('plan.planName', 'ASC');

    if (!includeInactive) {
      queryBuilder.andWhere('plan.isActive = :isActive', { isActive: true });
    }

    return queryBuilder.getMany();
  }
}


