import { Integration } from '../entities';

export class IntegrationResponseDto {
  id: number;
  integrationKey: string;
  integrationName: string;
  description: string | null;
  integrationType: string;
  provider: string;
  status: string;
  isActive: boolean;
  baseUrl: string | null;
  customHeaders: Record<string, string> | null;
  configuration: Record<string, any> | null;
  lastHealthCheckAt: Date | null;
  lastSuccessfulConnectionAt: Date | null;
  lastError: string | null;
  errorCount: number;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  // OAuth2 fields (excluded from response for security)
  hasOAuth2Token: boolean;
  oauth2TokenExpiresAt: Date | null;

  static fromEntity(entity: Integration): IntegrationResponseDto {
    const dto = new IntegrationResponseDto();
    dto.id = entity.id;
    dto.integrationKey = entity.integrationKey;
    dto.integrationName = entity.integrationName;
    dto.description = entity.description;
    dto.integrationType = entity.integrationType;
    dto.provider = entity.provider;
    dto.status = entity.status;
    dto.isActive = entity.isActive;
    dto.baseUrl = entity.baseUrl;
    dto.customHeaders = entity.customHeaders;
    dto.configuration = entity.configuration;
    dto.lastHealthCheckAt = entity.lastHealthCheckAt;
    dto.lastSuccessfulConnectionAt = entity.lastSuccessfulConnectionAt;
    dto.lastError = entity.lastError;
    dto.errorCount = entity.errorCount;
    dto.metadata = entity.metadata;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.createdBy = entity.createdBy;
    dto.updatedBy = entity.updatedBy;

    // OAuth2 token info (without exposing actual tokens)
    dto.hasOAuth2Token = !!entity.oauth2AccessToken;
    dto.oauth2TokenExpiresAt = entity.oauth2TokenExpiresAt;

    return dto;
  }
}
