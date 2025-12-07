import {
  WebhookSubscription,
  WebhookEventType,
  WebhookSubscriptionStatus,
} from '../entities/webhook-subscription.entity';

export class WebhookSubscriptionResponseDto {
  id: number;
  subscriptionKey: string;
  subscriptionName: string;
  description: string | null;
  organizationId: number;
  webhookUrl: string;
  eventTypes: WebhookEventType[];
  eventFilters: Record<string, any> | null;
  httpMethod: string;
  customHeaders: Record<string, string> | null;
  maxRetries: number;
  retryDelaySeconds: number;
  timeoutMs: number;
  isActive: boolean;
  status: WebhookSubscriptionStatus;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  lastFailureReason: string | null;
  successCount: number;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: WebhookSubscription): WebhookSubscriptionResponseDto {
    const dto = new WebhookSubscriptionResponseDto();
    dto.id = entity.id;
    dto.subscriptionKey = entity.subscriptionKey;
    dto.subscriptionName = entity.subscriptionName;
    dto.description = entity.description;
    dto.organizationId = entity.organizationId;
    dto.webhookUrl = entity.webhookUrl;
    dto.eventTypes = entity.eventTypes;
    dto.eventFilters = entity.eventFilters;
    dto.httpMethod = entity.httpMethod;
    dto.customHeaders = entity.customHeaders;
    dto.maxRetries = entity.maxRetries;
    dto.retryDelaySeconds = entity.retryDelaySeconds;
    dto.timeoutMs = entity.timeoutMs;
    dto.isActive = entity.isActive;
    dto.status = entity.status;
    dto.lastSuccessAt = entity.lastSuccessAt;
    dto.lastFailureAt = entity.lastFailureAt;
    dto.lastFailureReason = entity.lastFailureReason;
    dto.successCount = entity.successCount;
    dto.failureCount = entity.failureCount;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
