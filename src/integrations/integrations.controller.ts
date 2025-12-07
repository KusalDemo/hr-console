import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IntegrationService, WebhookService } from './services';
import {
  CreateIntegrationDto,
  UpdateIntegrationDto,
  TestIntegrationDto,
  IntegrationResponseDto,
  IntegrationHealthResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { IntegrationType } from './entities';

/**
 * Integrations Controller
 * 
 * REST API endpoints for integration management:
 * - Integration CRUD operations
 * - OAuth2 flow management
 * - Integration health monitoring
 * - Webhook operations
 */
@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegrationsController {
  constructor(
    private readonly integrationService: IntegrationService,
    private readonly webhookService: WebhookService,
  ) {}

  // ========== Integration CRUD ==========

  /**
   * Create integration
   * POST /integrations
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('ADMIN', 'HR')
  async createIntegration(
    @Body() createDto: CreateIntegrationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<IntegrationResponseDto> {
    return this.integrationService.createIntegration(createDto, user.userId);
  }

  /**
   * Get integration by ID
   * GET /integrations/:id
   */
  @Get(':id')
  async getIntegration(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<IntegrationResponseDto> {
    return this.integrationService.getIntegrationById(id);
  }

  /**
   * Get integration by key
   * GET /integrations/key/:key
   */
  @Get('key/:key')
  async getIntegrationByKey(@Param('key') key: string): Promise<IntegrationResponseDto> {
    return this.integrationService.getIntegrationByKey(key);
  }

  /**
   * Update integration
   * PUT /integrations/:id
   */
  @Put(':id')
  @Roles('ADMIN', 'HR')
  async updateIntegration(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateIntegrationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<IntegrationResponseDto> {
    return this.integrationService.updateIntegration(id, updateDto, user.userId);
  }

  /**
   * Delete integration
   * DELETE /integrations/:id
   */
  @Delete(':id')
  @Roles('ADMIN', 'HR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteIntegration(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.integrationService.deleteIntegration(id);
  }

  /**
   * Get active integrations
   * GET /integrations
   */
  @Get()
  async getIntegrations(
    @Query('type') type?: IntegrationType,
    @Query('provider') provider?: string,
  ): Promise<IntegrationResponseDto[]> {
    return this.integrationService.getActiveIntegrations(type, provider);
  }

  // ========== OAuth2 Operations ==========

  /**
   * Get OAuth2 authorization URL
   * GET /integrations/:id/oauth2/authorize
   */
  @Get(':id/oauth2/authorize')
  @Roles('ADMIN', 'HR')
  async getOAuth2AuthorizationUrl(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ url: string }> {
    return this.integrationService.getOAuth2AuthorizationUrl(id);
  }

  /**
   * Complete OAuth2 flow
   * POST /integrations/:id/oauth2/callback
   */
  @Post(':id/oauth2/callback')
  @Roles('ADMIN', 'HR')
  async completeOAuth2Flow(
    @Param('id', ParseIntPipe) id: number,
    @Body('authorizationCode') authorizationCode: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<IntegrationResponseDto> {
    return this.integrationService.completeOAuth2Flow(id, authorizationCode, user.userId);
  }

  /**
   * Refresh OAuth2 token
   * POST /integrations/:id/oauth2/refresh
   */
  @Post(':id/oauth2/refresh')
  @Roles('ADMIN', 'HR')
  async refreshOAuth2Token(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<IntegrationResponseDto> {
    return this.integrationService.refreshOAuth2Token(id);
  }

  /**
   * Refresh all expired OAuth2 tokens
   * POST /integrations/oauth2/refresh-all
   */
  @Post('oauth2/refresh-all')
  @Roles('ADMIN', 'HR')
  async refreshAllExpiredTokens(): Promise<{ refreshed: number }> {
    const refreshed = await this.integrationService.refreshExpiredTokens();
    return { refreshed };
  }

  // ========== Health Monitoring ==========

  /**
   * Test integration connection
   * POST /integrations/:id/test
   */
  @Post(':id/test')
  @Roles('ADMIN', 'HR')
  async testIntegration(
    @Param('id', ParseIntPipe) id: number,
    @Body() testDto?: TestIntegrationDto,
  ): Promise<{
    success: boolean;
    responseTime: number;
    message: string;
    health: IntegrationHealthResponseDto;
  }> {
    return this.integrationService.testIntegration(id, testDto);
  }

  /**
   * Get integration health
   * GET /integrations/:id/health
   */
  @Get(':id/health')
  async getIntegrationHealth(
    @Param('id', ParseIntPipe) id: number,
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ): Promise<{
    current: IntegrationHealthResponseDto | null;
    statistics: {
      total: number;
      successful: number;
      failed: number;
      averageResponseTime: number;
      statusBreakdown: Record<string, number>;
    };
    recent: IntegrationHealthResponseDto[];
  }> {
    return this.integrationService.getIntegrationHealth(id, days || 7);
  }

  /**
   * Check health of all integrations
   * POST /integrations/health/check-all
   */
  @Post('health/check-all')
  @Roles('ADMIN', 'HR')
  async checkAllIntegrationsHealth(): Promise<{ checked: number }> {
    const checked = await this.integrationService.checkAllIntegrationsHealth();
    return { checked };
  }

  // ========== Webhook Operations ==========

  /**
   * Publish event to webhook
   * POST /integrations/:id/webhooks/publish
   */
  @Post(':id/webhooks/publish')
  @Roles('ADMIN', 'HR', 'SYSTEM')
  async publishWebhookEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body('eventType') eventType: string,
    @Body('eventData') eventData: Record<string, any>,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.webhookService.publishEvent(id, eventType, eventData);
      return { success: true, message: 'Webhook event published successfully' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Test webhook integration
   * POST /integrations/:id/webhooks/test
   */
  @Post(':id/webhooks/test')
  @Roles('ADMIN', 'HR')
  async testWebhook(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{
    success: boolean;
    responseTime: number;
    message: string;
  }> {
    return this.webhookService.testWebhook(id);
  }
}
