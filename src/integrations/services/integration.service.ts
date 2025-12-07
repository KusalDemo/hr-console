import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IntegrationRepository, IntegrationHealthRepository } from '../repositories';
import {
  Integration,
  IntegrationType,
  IntegrationStatus,
  IntegrationHealth,
  HealthStatus,
} from '../entities';
import { WebhookService } from './webhook.service';
import {
  CreateIntegrationDto,
  UpdateIntegrationDto,
  TestIntegrationDto,
  IntegrationResponseDto,
  IntegrationHealthResponseDto,
} from '../dto';

/**
 * Integration Service
 *
 * Manages external system integrations:
 * - OAuth2 integrations (Slack, Google, etc.)
 * - API key integrations
 * - Webhook integrations
 * - Basic auth integrations
 * - Integration health monitoring
 * - Token refresh for OAuth2
 */
@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly healthRepository: IntegrationHealthRepository,
    private readonly webhookService: WebhookService,
    private readonly dataSource: DataSource,
  ) {}

  // ==================== Integration CRUD ====================

  /**
   * Create integration
   */
  async createIntegration(
    createDto: CreateIntegrationDto,
    createdBy?: number,
  ): Promise<IntegrationResponseDto> {
    // Check if integration key already exists
    const existing = await this.integrationRepository.findByKey(createDto.integrationKey);
    if (existing) {
      throw new BadRequestException(
        `Integration with key "${createDto.integrationKey}" already exists`,
      );
    }

    const integration = this.integrationRepository.create({
      ...createDto,
      createdBy: createdBy || null,
    });

    const saved = await this.integrationRepository.save(integration);
    this.logger.log(`Created integration: ${saved.integrationKey}`);

    return IntegrationResponseDto.fromEntity(saved);
  }

  /**
   * Get integration by ID
   */
  async getIntegrationById(id: number): Promise<IntegrationResponseDto> {
    const integration = await this.integrationRepository.findOne({ where: { id } });
    if (!integration) {
      throw new NotFoundException(`Integration not found: ${id}`);
    }
    return IntegrationResponseDto.fromEntity(integration);
  }

  /**
   * Get integration by key
   */
  async getIntegrationByKey(integrationKey: string): Promise<IntegrationResponseDto> {
    const integration = await this.integrationRepository.findByKey(integrationKey);
    if (!integration) {
      throw new NotFoundException(`Integration not found: ${integrationKey}`);
    }
    return IntegrationResponseDto.fromEntity(integration);
  }

  /**
   * Update integration
   */
  async updateIntegration(
    id: number,
    updateDto: UpdateIntegrationDto,
    updatedBy?: number,
  ): Promise<IntegrationResponseDto> {
    const integration = await this.integrationRepository.findOne({ where: { id } });
    if (!integration) {
      throw new NotFoundException(`Integration not found: ${id}`);
    }

    Object.assign(integration, {
      ...updateDto,
      updatedBy: updatedBy || null,
    });

    const saved = await this.integrationRepository.save(integration);
    this.logger.log(`Updated integration: ${saved.integrationKey}`);

    return IntegrationResponseDto.fromEntity(saved);
  }

  /**
   * Delete integration
   */
  async deleteIntegration(id: number): Promise<void> {
    const integration = await this.integrationRepository.findOne({ where: { id } });
    if (!integration) {
      throw new NotFoundException(`Integration not found: ${id}`);
    }

    await this.integrationRepository.remove(integration);
    this.logger.log(`Deleted integration: ${integration.integrationKey}`);
  }

  /**
   * Get all active integrations
   */
  async getActiveIntegrations(
    type?: IntegrationType,
    provider?: string,
  ): Promise<IntegrationResponseDto[]> {
    let integrations: Integration[];
    if (type) {
      integrations = await this.integrationRepository.findByType(type);
    } else if (provider) {
      integrations = await this.integrationRepository.findByProvider(provider);
    } else {
      integrations = await this.integrationRepository.findActive();
    }

    return integrations.map((i) => IntegrationResponseDto.fromEntity(i));
  }

  // ==================== OAuth2 Operations ====================

  /**
   * Get OAuth2 authorization URL
   */
  async getOAuth2AuthorizationUrl(id: number): Promise<{ url: string }> {
    const integration = await this.integrationRepository.findOne({ where: { id } });
    if (!integration) {
      throw new NotFoundException(`Integration not found: ${id}`);
    }

    if (integration.integrationType !== IntegrationType.OAUTH2) {
      throw new BadRequestException('Integration is not OAuth2 type');
    }

    if (!integration.oauth2AuthorizationUrl) {
      throw new BadRequestException('OAuth2 authorization URL not configured');
    }

    // Build authorization URL with parameters
    const params = new URLSearchParams({
      client_id: integration.oauth2ClientId || '',
      redirect_uri: integration.configuration?.redirectUri || '',
      response_type: 'code',
      scope: (integration.oauth2Scopes || []).join(' '),
      state: integration.id.toString(),
    });

    const url = `${integration.oauth2AuthorizationUrl}?${params.toString()}`;
    return { url };
  }

  /**
   * Complete OAuth2 flow (exchange code for token)
   */
  async completeOAuth2Flow(
    id: number,
    authorizationCode: string,
    updatedBy?: number,
  ): Promise<IntegrationResponseDto> {
    const integration = await this.integrationRepository.findOne({ where: { id } });
    if (!integration) {
      throw new NotFoundException(`Integration not found: ${id}`);
    }

    if (integration.integrationType !== IntegrationType.OAUTH2) {
      throw new BadRequestException('Integration is not OAuth2 type');
    }

    // TODO: Implement actual OAuth2 token exchange
    // This would make an HTTP request to the token URL
    this.logger.warn('OAuth2 token exchange not yet implemented');

    // For now, just update status
    integration.status = IntegrationStatus.ACTIVE;
    integration.updatedBy = updatedBy || null;
    const saved = await this.integrationRepository.save(integration);

    return IntegrationResponseDto.fromEntity(saved);
  }

  /**
   * Refresh OAuth2 token
   */
  async refreshOAuth2Token(id: number): Promise<IntegrationResponseDto> {
    const integration = await this.integrationRepository.findOne({ where: { id } });
    if (!integration) {
      throw new NotFoundException(`Integration not found: ${id}`);
    }

    if (integration.integrationType !== IntegrationType.OAUTH2) {
      throw new BadRequestException('Integration is not OAuth2 type');
    }

    if (!integration.oauth2RefreshToken) {
      throw new BadRequestException('No refresh token available');
    }

    // TODO: Implement actual OAuth2 token refresh
    this.logger.warn('OAuth2 token refresh not yet implemented');

    // For now, just update last successful connection
    integration.lastSuccessfulConnectionAt = new Date();
    integration.errorCount = 0;
    const saved = await this.integrationRepository.save(integration);

    return IntegrationResponseDto.fromEntity(saved);
  }

  /**
   * Refresh all expired OAuth2 tokens
   */
  async refreshExpiredTokens(): Promise<number> {
    const integrations = await this.integrationRepository.findNeedingTokenRefresh();
    let refreshed = 0;

    for (const integration of integrations) {
      try {
        await this.refreshOAuth2Token(integration.id);
        refreshed++;
      } catch (error) {
        this.logger.error(
          `Failed to refresh token for integration ${integration.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return refreshed;
  }

  // ==================== Health Monitoring ====================

  /**
   * Test integration connection
   */
  async testIntegration(
    id: number,
    testDto?: TestIntegrationDto,
  ): Promise<{
    success: boolean;
    responseTime: number;
    message: string;
    health: IntegrationHealthResponseDto;
  }> {
    const integration = await this.integrationRepository.findOne({ where: { id } });
    if (!integration) {
      throw new NotFoundException(`Integration not found: ${id}`);
    }

    const startTime = Date.now();
    let success = false;
    let message = 'Connection test completed';
    const httpStatusCode: number | null = null;
    let errorMessage: string | null = null;

    try {
      // Perform health check based on integration type
      switch (integration.integrationType) {
        case IntegrationType.OAUTH2:
          // Test OAuth2 token validity
          if (integration.isOAuth2TokenExpired()) {
            throw new Error('OAuth2 token is expired');
          }
          success = true;
          break;

        case IntegrationType.API_KEY:
        case IntegrationType.BASIC_AUTH:
          // Test API connection
          if (integration.baseUrl) {
            // TODO: Make actual HTTP request to test connection
            // For now, just check if base URL is set
            success = true;
          } else {
            throw new Error('Base URL not configured');
          }
          break;

        case IntegrationType.WEBHOOK:
          // Test webhook URL
          if (integration.webhookUrl) {
            // TODO: Make actual HTTP request to test webhook
            success = true;
          } else {
            throw new Error('Webhook URL not configured');
          }
          break;

        default:
          success = true;
      }
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : String(error);
      message = `Connection test failed: ${errorMessage}`;
    }

    const responseTime = Date.now() - startTime;

    // Update integration status
    if (success) {
      integration.status = IntegrationStatus.ACTIVE;
      integration.lastSuccessfulConnectionAt = new Date();
      integration.errorCount = 0;
      integration.lastError = null;
    } else {
      integration.status = IntegrationStatus.ERROR;
      integration.errorCount += 1;
      integration.lastError = errorMessage;
    }
    integration.lastHealthCheckAt = new Date();
    await this.integrationRepository.save(integration);

    // Create health record
    const health = this.healthRepository.create({
      integrationId: integration.id,
      status: success ? HealthStatus.HEALTHY : HealthStatus.DOWN,
      responseTimeMs: responseTime,
      httpStatusCode,
      errorMessage,
      isSuccessful: success,
      checkDetails: {
        testType: testDto?.testType || 'CONNECTION',
        integrationType: integration.integrationType,
      },
    });

    const savedHealth = await this.healthRepository.save(health);

    return {
      success,
      responseTime,
      message,
      health: IntegrationHealthResponseDto.fromEntity(savedHealth),
    };
  }

  /**
   * Get integration health
   */
  async getIntegrationHealth(
    id: number,
    days: number = 7,
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
    const integration = await this.integrationRepository.findOne({ where: { id } });
    if (!integration) {
      throw new NotFoundException(`Integration not found: ${id}`);
    }

    const current = await this.healthRepository.findLatestByIntegration(id);
    const statistics = await this.healthRepository.getHealthStatistics(id, days);
    const recent = await this.healthRepository.findByIntegration(id, 10);

    return {
      current: current ? IntegrationHealthResponseDto.fromEntity(current) : null,
      statistics,
      recent: recent.map((h) => IntegrationHealthResponseDto.fromEntity(h)),
    };
  }

  /**
   * Check health of all integrations
   */
  async checkAllIntegrationsHealth(): Promise<number> {
    const integrations = await this.integrationRepository.findActive();
    let checked = 0;

    for (const integration of integrations) {
      try {
        await this.testIntegration(integration.id);
        checked++;
      } catch (error) {
        this.logger.error(
          `Failed to check health for integration ${integration.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return checked;
  }
}
