import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IntegrationType } from '../entities';

export class CreateIntegrationDto {
  @IsString()
  @MaxLength(128)
  integrationKey: string;

  @IsString()
  @MaxLength(255)
  integrationName: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsEnum(IntegrationType)
  integrationType: IntegrationType;

  @IsString()
  @MaxLength(128)
  provider: string;

  // OAuth2 fields
  @ValidateIf((o) => o.integrationType === IntegrationType.OAUTH2)
  @IsOptional()
  @IsString()
  @MaxLength(512)
  oauth2ClientId?: string | null;

  @ValidateIf((o) => o.integrationType === IntegrationType.OAUTH2)
  @IsOptional()
  @IsString()
  @MaxLength(512)
  oauth2ClientSecret?: string | null;

  @ValidateIf((o) => o.integrationType === IntegrationType.OAUTH2)
  @IsOptional()
  @IsString()
  @MaxLength(512)
  oauth2AuthorizationUrl?: string | null;

  @ValidateIf((o) => o.integrationType === IntegrationType.OAUTH2)
  @IsOptional()
  @IsString()
  @MaxLength(512)
  oauth2TokenUrl?: string | null;

  @ValidateIf((o) => o.integrationType === IntegrationType.OAUTH2)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  oauth2Scopes?: string[] | null;

  // API Key fields
  @ValidateIf((o) => o.integrationType === IntegrationType.API_KEY)
  @IsOptional()
  @IsString()
  @MaxLength(512)
  apiKey?: string | null;

  @ValidateIf((o) => o.integrationType === IntegrationType.API_KEY)
  @IsOptional()
  @IsString()
  @MaxLength(512)
  apiSecret?: string | null;

  // Basic Auth fields
  @ValidateIf((o) => o.integrationType === IntegrationType.BASIC_AUTH)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  basicAuthUsername?: string | null;

  @ValidateIf((o) => o.integrationType === IntegrationType.BASIC_AUTH)
  @IsOptional()
  @IsString()
  @MaxLength(512)
  basicAuthPassword?: string | null;

  // Webhook fields
  @ValidateIf((o) => o.integrationType === IntegrationType.WEBHOOK)
  @IsOptional()
  @IsString()
  @MaxLength(512)
  webhookUrl?: string | null;

  @ValidateIf((o) => o.integrationType === IntegrationType.WEBHOOK)
  @IsOptional()
  @IsString()
  @MaxLength(512)
  webhookSecret?: string | null;

  // Common fields
  @IsOptional()
  @IsString()
  @MaxLength(512)
  baseUrl?: string | null;

  @IsOptional()
  customHeaders?: Record<string, string> | null;

  @IsOptional()
  configuration?: Record<string, any> | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  metadata?: Record<string, any> | null;
}
