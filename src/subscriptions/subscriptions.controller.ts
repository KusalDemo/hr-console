import {
  Controller,
  Get,
  Post,
  Patch,
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
import { SubscriptionsService } from './services/subscriptions.service';
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
} from './dto';
import { SubscriptionStatus } from './entities/subscription.entity';

/**
 * Subscription Management Controller
 * 
 * Handles subscription management operations (super admin only):
 * - POST /admin/subscriptions - Create subscription
 * - GET /admin/subscriptions - List subscriptions
 * - GET /admin/subscriptions/:id - Get subscription details
 * - PATCH /admin/subscriptions/:id - Update subscription
 * - POST /admin/subscriptions/:id/cancel - Cancel subscription
 * - POST /admin/subscriptions/:id/renew - Renew subscription
 */
@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TransformInterceptor)
@Roles('SUPER_ADMIN')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * Create a new subscription
   * 
   * Creates a subscription for a tenant with the specified plan.
   * Supports trial periods, custom amounts, and payment gateway integration.
   * 
   * @param createDto - Subscription creation data
   * @param user - Current user (super admin)
   * @returns Created subscription information
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(
    @Body() createDto: CreateSubscriptionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SubscriptionCreationResponseDto> {
    return this.subscriptionsService.createSubscription(createDto, user.userId);
  }

  /**
   * Create subscription with plan selection (simplified)
   * 
   * Simplified endpoint for creating a subscription by selecting a plan.
   * Automatically handles billing period calculation and trial setup.
   * 
   * @param createDto - Simplified subscription creation data
   * @param user - Current user (super admin)
   * @returns Created subscription information
   */
  @Post('with-plan')
  @HttpCode(HttpStatus.CREATED)
  async createSubscriptionWithPlan(
    @Body() createDto: CreateSubscriptionWithPlanDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SubscriptionCreationResponseDto> {
    return this.subscriptionsService.createSubscriptionWithPlan(createDto, user.userId);
  }

  /**
   * List all subscriptions
   * 
   * Returns a paginated list of subscriptions with optional filtering.
   * 
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10, max: 100)
   * @param status - Filter by subscription status (optional)
   * @param tenantId - Filter by tenant ID (optional)
   * @param planId - Filter by plan ID (optional)
   * @returns Paginated list of subscriptions
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listSubscriptions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string,
    @Query('planId') planId?: string,
  ): Promise<SubscriptionListResponseDto> {
    // Validate and limit page size
    const validatedLimit = Math.min(limit, 100);
    const validatedPage = Math.max(page, 1);

    // Build filters
    const filters: {
      status?: SubscriptionStatus;
      tenantId?: number;
      planId?: number;
    } = {};

    if (status) {
      const subscriptionStatus = Object.values(SubscriptionStatus).find(
        (s) => s.toLowerCase() === status.toLowerCase(),
      );
      if (subscriptionStatus) {
        filters.status = subscriptionStatus;
      }
    }

    if (tenantId) {
      const parsedTenantId = parseInt(tenantId, 10);
      if (!isNaN(parsedTenantId)) {
        filters.tenantId = parsedTenantId;
      }
    }

    if (planId) {
      const parsedPlanId = parseInt(planId, 10);
      if (!isNaN(parsedPlanId)) {
        filters.planId = parsedPlanId;
      }
    }

    return this.subscriptionsService.getSubscriptionsWithPagination(
      validatedPage,
      validatedLimit,
      Object.keys(filters).length > 0 ? filters : undefined,
    );
  }

  /**
   * Get subscription details by ID
   * 
   * Returns detailed information about a specific subscription,
   * including computed fields like days remaining and access status.
   * 
   * @param id - Subscription ID
   * @returns Subscription details
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getSubscription(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SubscriptionDetailResponseDto> {
    return this.subscriptionsService.getSubscriptionById(id);
  }

  /**
   * Update subscription
   * 
   * Updates subscription information. Only provided fields will be updated.
   * Supports updating plan, status, billing period, payment information, etc.
   * 
   * @param id - Subscription ID
   * @param updateDto - Subscription update data
   * @param user - Current user (super admin)
   * @returns Updated subscription
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSubscriptionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.updateSubscription(id, updateDto, user.userId);
  }

  /**
   * Cancel subscription
   * 
   * Cancels a subscription. Can be set to cancel immediately or at period end.
   * 
   * @param id - Subscription ID
   * @param cancelDto - Cancellation data
   * @param user - Current user (super admin)
   * @returns Updated subscription
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Body() cancelDto: CancelSubscriptionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.cancelSubscription(id, cancelDto, user.userId);
  }

  /**
   * Renew subscription
   * 
   * Renews a subscription, optionally changing the plan.
   * Calculates new billing period and updates subscription status.
   * 
   * @param id - Subscription ID
   * @param renewDto - Renewal data
   * @param user - Current user (super admin)
   * @returns Updated subscription
   */
  @Post(':id/renew')
  @HttpCode(HttpStatus.OK)
  async renewSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Body() renewDto: RenewSubscriptionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.renewSubscription(id, renewDto, user.userId);
  }

  /**
   * Get active subscription for a tenant
   * 
   * Returns the active subscription for a specific tenant.
   * 
   * @param tenantId - Tenant ID
   * @returns Active subscription or null
   */
  @Get('tenant/:tenantId/active')
  @HttpCode(HttpStatus.OK)
  async getActiveSubscriptionForTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ): Promise<SubscriptionResponseDto | null> {
    return this.subscriptionsService.getActiveSubscription(tenantId);
  }

  /**
   * Get all subscriptions for a tenant
   * 
   * Returns all subscriptions (active and historical) for a specific tenant.
   * 
   * @param tenantId - Tenant ID
   * @returns List of subscriptions
   */
  @Get('tenant/:tenantId')
  @HttpCode(HttpStatus.OK)
  async getSubscriptionsForTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ): Promise<SubscriptionResponseDto[]> {
    return this.subscriptionsService.getSubscriptionsByTenantId(tenantId);
  }
}

