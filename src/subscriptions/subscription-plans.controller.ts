import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { SubscriptionPlansService } from './services/subscription-plans.service';
import { CreatePlanDto, UpdatePlanDto, PlanResponseDto, PlanListResponseDto } from './dto';
import { BillingCycle } from './entities/subscription-plan.entity';

/**
 * Subscription Plans Management Controller
 * 
 * Handles subscription plan management operations (super admin only):
 * - GET /admin/plans - List plans
 * - GET /admin/plans/:id - Get plan details
 * - POST /admin/plans - Create plan
 * - PATCH /admin/plans/:id - Update plan
 * - DELETE /admin/plans/:id - Deactivate plan
 */
@Controller('admin/plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TransformInterceptor)
@Roles('SUPER_ADMIN')
export class SubscriptionPlansController {
  constructor(private readonly plansService: SubscriptionPlansService) {}

  /**
   * List all subscription plans
   * 
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, max: 100)
   * @param includeInactive - Include inactive plans (default: false)
   * @param billingCycle - Filter by billing cycle (optional)
   * @returns Paginated list of plans
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listPlans(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe) includeInactive: boolean,
    @Query('billingCycle') billingCycle?: string,
  ): Promise<PlanListResponseDto> {
    // Validate and limit page size
    const validatedLimit = Math.min(limit, 100);
    const validatedPage = Math.max(page, 1);

    // Parse billing cycle if provided
    let billingCycleEnum: BillingCycle | undefined;
    if (billingCycle) {
      const cycle = Object.values(BillingCycle).find(
        (c) => c.toLowerCase() === billingCycle.toLowerCase(),
      );
      if (cycle) {
        billingCycleEnum = cycle;
      }
    }

    // Get all plans (service handles filtering)
    const plans = await this.plansService.listPlans(includeInactive, billingCycleEnum);

    // Manual pagination (since service doesn't support pagination yet)
    const startIndex = (validatedPage - 1) * validatedLimit;
    const endIndex = startIndex + validatedLimit;
    const paginatedPlans = plans.slice(startIndex, endIndex);

    // Convert to response DTOs
    const planResponses: PlanResponseDto[] = paginatedPlans.map((plan) => ({
      id: plan.id,
      planKey: plan.planKey,
      planName: plan.planName,
      description: plan.description,
      price: Number(plan.price),
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      billingInterval: plan.billingInterval,
      maxUsers: plan.maxUsers,
      maxOrganizations: plan.maxOrganizations,
      maxStorageGb: plan.maxStorageGb,
      features: plan.features,
      isActive: plan.isActive,
      isDefault: plan.isDefault,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      createdBy: plan.createdBy,
      updatedBy: plan.updatedBy,
    }));

    const totalPages = Math.ceil(plans.length / validatedLimit);

    return {
      plans: planResponses,
      total: plans.length,
      page: validatedPage,
      limit: validatedLimit,
      totalPages,
    };
  }

  /**
   * Get plan details by ID
   * 
   * @param id - Plan ID
   * @param includeInactive - Include inactive plans (default: false)
   * @returns Plan details
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getPlan(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe) includeInactive: boolean,
  ): Promise<PlanResponseDto> {
    const plan = await this.plansService.getPlanById(id, includeInactive);

    return {
      id: plan.id,
      planKey: plan.planKey,
      planName: plan.planName,
      description: plan.description,
      price: Number(plan.price),
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      billingInterval: plan.billingInterval,
      maxUsers: plan.maxUsers,
      maxOrganizations: plan.maxOrganizations,
      maxStorageGb: plan.maxStorageGb,
      features: plan.features,
      isActive: plan.isActive,
      isDefault: plan.isDefault,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      createdBy: plan.createdBy,
      updatedBy: plan.updatedBy,
    };
  }

  /**
   * Create a new subscription plan
   * 
   * @param createDto - Plan creation data
   * @param user - Current user (super admin)
   * @returns Created plan
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPlan(
    @Body() createDto: CreatePlanDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PlanResponseDto> {
    const plan = await this.plansService.createPlan(createDto, user.userId);

    return {
      id: plan.id,
      planKey: plan.planKey,
      planName: plan.planName,
      description: plan.description,
      price: Number(plan.price),
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      billingInterval: plan.billingInterval,
      maxUsers: plan.maxUsers,
      maxOrganizations: plan.maxOrganizations,
      maxStorageGb: plan.maxStorageGb,
      features: plan.features,
      isActive: plan.isActive,
      isDefault: plan.isDefault,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      createdBy: plan.createdBy,
      updatedBy: plan.updatedBy,
    };
  }

  /**
   * Update a subscription plan
   * 
   * @param id - Plan ID
   * @param updateDto - Plan update data
   * @param user - Current user (super admin)
   * @returns Updated plan
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updatePlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePlanDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PlanResponseDto> {
    const plan = await this.plansService.updatePlan(id, updateDto, user.userId);

    return {
      id: plan.id,
      planKey: plan.planKey,
      planName: plan.planName,
      description: plan.description,
      price: Number(plan.price),
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      billingInterval: plan.billingInterval,
      maxUsers: plan.maxUsers,
      maxOrganizations: plan.maxOrganizations,
      maxStorageGb: plan.maxStorageGb,
      features: plan.features,
      isActive: plan.isActive,
      isDefault: plan.isDefault,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      createdBy: plan.createdBy,
      updatedBy: plan.updatedBy,
    };
  }

  /**
   * Deactivate a subscription plan
   * 
   * @param id - Plan ID
   * @param user - Current user (super admin)
   * @returns Deactivated plan
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deactivatePlan(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<PlanResponseDto> {
    const plan = await this.plansService.deactivatePlan(id, user.userId);

    return {
      id: plan.id,
      planKey: plan.planKey,
      planName: plan.planName,
      description: plan.description,
      price: Number(plan.price),
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      billingInterval: plan.billingInterval,
      maxUsers: plan.maxUsers,
      maxOrganizations: plan.maxOrganizations,
      maxStorageGb: plan.maxStorageGb,
      features: plan.features,
      isActive: plan.isActive,
      isDefault: plan.isDefault,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
      createdBy: plan.createdBy,
      updatedBy: plan.updatedBy,
    };
  }
}

