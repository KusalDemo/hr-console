import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WebhookService, WebhookDeliveryService } from './services';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  CreateWebhookSubscriptionDto,
  UpdateWebhookSubscriptionDto,
  TestWebhookDto,
  WebhookSubscriptionResponseDto,
} from './dto';

/**
 * Webhooks Controller
 * 
 * REST API for webhook subscription management:
 * - Create, read, update, delete subscriptions
 * - Test webhook delivery
 * - View webhook events
 * - Replay dead letter events
 */
@Controller('webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WebhooksController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly deliveryService: WebhookDeliveryService,
  ) {}

  /**
   * Create webhook subscription
   */
  @Post('subscriptions')
  @Roles('ROLE_ADMIN', 'ROLE_HR')
  async createSubscription(
    @Body() createDto: CreateWebhookSubscriptionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<WebhookSubscriptionResponseDto> {
    return this.webhookService.createSubscription(createDto, user.userId);
  }

  /**
   * Get subscription by ID
   */
  @Get('subscriptions/:id')
  @Roles('ROLE_ADMIN', 'ROLE_HR')
  async getSubscription(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<WebhookSubscriptionResponseDto> {
    return this.webhookService.getSubscriptionById(id);
  }

  /**
   * Get subscription by key
   */
  @Get('subscriptions/key/:key')
  @Roles('ROLE_ADMIN', 'ROLE_HR')
  async getSubscriptionByKey(
    @Param('key') key: string,
  ): Promise<WebhookSubscriptionResponseDto> {
    return this.webhookService.getSubscriptionByKey(key);
  }

  /**
   * Get all subscriptions for an organization
   */
  @Get('subscriptions/organization/:organizationId')
  @Roles('ROLE_ADMIN', 'ROLE_HR')
  async getSubscriptionsByOrganization(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ): Promise<WebhookSubscriptionResponseDto[]> {
    return this.webhookService.getSubscriptionsByOrganization(organizationId);
  }

  /**
   * Update webhook subscription
   */
  @Put('subscriptions/:id')
  @Roles('ROLE_ADMIN', 'ROLE_HR')
  async updateSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateWebhookSubscriptionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<WebhookSubscriptionResponseDto> {
    return this.webhookService.updateSubscription(id, updateDto, user.userId);
  }

  /**
   * Delete webhook subscription
   */
  @Delete('subscriptions/:id')
  @Roles('ROLE_ADMIN', 'ROLE_HR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSubscription(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.webhookService.deleteSubscription(id, user.userId);
  }

  /**
   * Test webhook subscription
   */
  @Post('subscriptions/:id/test')
  @Roles('ROLE_ADMIN', 'ROLE_HR')
  async testSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Body() testDto: TestWebhookDto,
  ): Promise<{ success: boolean; message: string; response?: any }> {
    return this.webhookService.testSubscription(id, testDto);
  }

  /**
   * Replay dead letter events
   */
  @Post('subscriptions/:id/replay')
  @Roles('ROLE_ADMIN', 'ROLE_HR')
  async replayDeadLetterEvents(
    @Param('id', ParseIntPipe) id: number,
    @Body('limit') limit?: number,
  ): Promise<{ replayed: number }> {
    const replayed = await this.deliveryService.replayDeadLetterEvents(id, limit || 10);
    return { replayed };
  }

  /**
   * Process pending webhook events (for background job)
   */
  @Post('process')
  @Roles('ROLE_ADMIN', 'ROLE_SYSTEM')
  @HttpCode(HttpStatus.OK)
  async processPendingEvents(): Promise<{ processed: number }> {
    await this.deliveryService.processPendingEvents();
    return { processed: 0 }; // Could return actual count if needed
  }
}
