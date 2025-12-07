import { IsOptional, IsEnum, IsObject } from 'class-validator';
import { WebhookEventType } from '../entities/webhook-subscription.entity';

export class TestWebhookDto {
  @IsOptional()
  @IsEnum(WebhookEventType)
  eventType?: WebhookEventType;

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
