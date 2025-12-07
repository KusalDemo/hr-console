import { Injectable, Logger } from '@nestjs/common';
import { IntegrationRepository } from '../repositories';
import { Integration, IntegrationType } from '../entities';

/**
 * Webhook Service
 * 
 * Handles webhook operations:
 * - Webhook event publishing
 * - Webhook delivery with retry logic
 * - Webhook signature generation
 * - Webhook testing
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly maxRetries = 3;
  private readonly retryDelays = [1000, 5000, 30000]; // 1s, 5s, 30s

  constructor(private readonly integrationRepository: IntegrationRepository) {}

  /**
   * Publish event to webhook integration
   */
  async publishEvent(
    integrationId: number,
    eventType: string,
    eventData: Record<string, any>,
  ): Promise<void> {
    const integration = await this.integrationRepository.findOne({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    if (integration.integrationType !== IntegrationType.WEBHOOK) {
      throw new Error(`Integration ${integrationId} is not a webhook integration`);
    }

    if (!integration.webhookUrl) {
      throw new Error(`Webhook URL not configured for integration ${integrationId}`);
    }

    await this.deliverWebhook(integration, eventType, eventData);
  }

  /**
   * Deliver webhook event
   */
  private async deliverWebhook(
    integration: Integration,
    eventType: string,
    eventData: Record<string, any>,
    retryCount: number = 0,
  ): Promise<void> {
    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: eventData,
    };

    // Generate signature if secret is configured
    const signature = integration.webhookSecret
      ? this.generateSignature(JSON.stringify(payload), integration.webhookSecret)
      : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...integration.customHeaders,
    };

    if (signature) {
      headers['X-Webhook-Signature'] = signature;
    }

    try {
      this.logger.debug(
        `Delivering webhook to ${integration.webhookUrl} (attempt ${retryCount + 1}/${this.maxRetries + 1})`,
      );

      const response = await fetch(integration.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout((integration.configuration?.timeoutSeconds || 30) * 1000),
      });

      if (!response.ok) {
        throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
      }

      this.logger.log(`Webhook delivered successfully to ${integration.webhookUrl}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Retry logic
      if (retryCount < this.maxRetries) {
        const delay = this.retryDelays[retryCount] || 60000;
        this.logger.warn(
          `Webhook delivery failed (attempt ${retryCount + 1}/${this.maxRetries + 1}). Retrying in ${delay}ms... Error: ${errorMessage}`,
        );

        await this.sleep(delay);
        return this.deliverWebhook(integration, eventType, eventData, retryCount + 1);
      }

      // Max retries reached
      this.logger.error(
        `Webhook delivery failed after ${retryCount + 1} attempts to ${integration.webhookUrl}: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Test webhook integration
   */
  async testWebhook(integrationId: number): Promise<{
    success: boolean;
    responseTime: number;
    message: string;
  }> {
    const integration = await this.integrationRepository.findOne({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    if (integration.integrationType !== IntegrationType.WEBHOOK) {
      throw new Error(`Integration ${integrationId} is not a webhook integration`);
    }

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook',
      },
    };

    const startTime = Date.now();
    let success = false;
    let message = 'Webhook test completed';

    try {
      const signature = integration.webhookSecret
        ? this.generateSignature(JSON.stringify(testPayload), integration.webhookSecret)
        : null;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...integration.customHeaders,
      };

      if (signature) {
        headers['X-Webhook-Signature'] = signature;
      }

      const response = await fetch(integration.webhookUrl!, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000), // 10 second timeout for test
      });

      if (response.ok) {
        success = true;
        message = `Webhook test successful: ${response.status} ${response.statusText}`;
      } else {
        message = `Webhook test failed: ${response.status} ${response.statusText}`;
      }
    } catch (error) {
      message = `Webhook test failed: ${error instanceof Error ? error.message : String(error)}`;
    }

    const responseTime = Date.now() - startTime;

    return {
      success,
      responseTime,
      message,
    };
  }

  /**
   * Generate webhook signature (HMAC-SHA256)
   */
  private generateSignature(payload: string, secret: string): string {
    // TODO: Implement actual HMAC-SHA256 signature generation
    // For now, return a placeholder
    // In production, use crypto.createHmac('sha256', secret).update(payload).digest('hex')
    this.logger.warn('Webhook signature generation not yet implemented');
    return 'signature-placeholder';
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
