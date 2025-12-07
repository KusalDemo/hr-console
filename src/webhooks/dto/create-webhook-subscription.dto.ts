import {
  IsString,
  IsUrl,
  IsEnum,
  IsOptional,
  IsNumber,
  IsObject,
  IsArray,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WebhookEventType, WebhookSubscriptionStatus } from '../entities/webhook-subscription.entity';

export class CreateWebhookSubscriptionDto {
  @IsString()
  @MaxLength(128)
  subscriptionKey: string;

  @IsString()
  @MaxLength(255)
  subscriptionName: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsNumber()
  organizationId: number;

  @IsUrl()
  @MaxLength(512)
  webhookUrl: string;

  @IsArray()
  @IsEnum(WebhookEventType, { each: true })
  eventTypes: WebhookEventType[];

  @IsOptional()
  @IsObject()
  eventFilters?: Record<string, any> | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  httpMethod?: string;

  @IsOptional()
  @IsObject()
  customHeaders?: Record<string, string> | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  secretKey?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3600)
  retryDelaySeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(300000)
  timeoutMs?: number;

  @IsOptional()
  @IsEnum(WebhookSubscriptionStatus)
  status?: WebhookSubscriptionStatus;
}
