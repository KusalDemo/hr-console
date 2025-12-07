import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { IntegrationHealth } from './integration-health.entity';

/**
 * Integration Type Enum
 */
export enum IntegrationType {
  OAUTH2 = 'OAUTH2',
  API_KEY = 'API_KEY',
  WEBHOOK = 'WEBHOOK',
  BASIC_AUTH = 'BASIC_AUTH',
  CUSTOM = 'CUSTOM',
}

/**
 * Integration Status Enum
 */
export enum IntegrationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  PENDING = 'PENDING',
}

/**
 * Integration Entity
 * 
 * Stores integration configurations for external systems:
 * - OAuth2 integrations (Slack, Google, etc.)
 * - API key integrations
 * - Webhook integrations
 * - Basic auth integrations
 * - Custom integrations
 */
@Entity('integrations')
@Index('idx_integrations_type', ['integrationType'])
@Index('idx_integrations_status', ['status'])
@Index('idx_integrations_active', ['isActive'])
@Index('idx_integrations_provider', ['provider'])
@Index('idx_integrations_key', ['integrationKey'], { unique: true })
export class Integration {
  @PrimaryGeneratedColumn('increment')
  id: number;

  /**
   * Unique integration key (e.g., "slack_workspace_123")
   */
  @Column({ name: 'integration_key', type: 'varchar', length: 128, unique: true, nullable: false })
  integrationKey: string;

  /**
   * Integration name
   */
  @Column({ name: 'integration_name', type: 'varchar', length: 255, nullable: false })
  integrationName: string;

  /**
   * Integration description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Integration type
   */
  @Column({
    name: 'integration_type',
    type: 'varchar',
    length: 32,
    nullable: false,
  })
  integrationType: IntegrationType;

  /**
   * Provider name (e.g., "slack", "google", "zapier")
   */
  @Column({ type: 'varchar', length: 128, nullable: false })
  provider: string;

  /**
   * Integration status
   */
  @Column({
    name: 'status',
    type: 'varchar',
    length: 32,
    nullable: false,
    default: IntegrationStatus.PENDING,
  })
  status: IntegrationStatus;

  /**
   * Whether integration is active
   */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  /**
   * OAuth2: Client ID
   */
  @Column({ name: 'oauth2_client_id', type: 'varchar', length: 512, nullable: true })
  oauth2ClientId: string | null;

  /**
   * OAuth2: Client Secret (encrypted)
   */
  @Column({ name: 'oauth2_client_secret', type: 'varchar', length: 512, nullable: true })
  oauth2ClientSecret: string | null;

  /**
   * OAuth2: Access Token (encrypted)
   */
  @Column({ name: 'oauth2_access_token', type: 'text', nullable: true })
  oauth2AccessToken: string | null;

  /**
   * OAuth2: Refresh Token (encrypted)
   */
  @Column({ name: 'oauth2_refresh_token', type: 'text', nullable: true })
  oauth2RefreshToken: string | null;

  /**
   * OAuth2: Token expires at
   */
  @Column({ name: 'oauth2_token_expires_at', type: 'timestamptz', nullable: true })
  oauth2TokenExpiresAt: Date | null;

  /**
   * OAuth2: Authorization URL
   */
  @Column({ name: 'oauth2_authorization_url', type: 'varchar', length: 512, nullable: true })
  oauth2AuthorizationUrl: string | null;

  /**
   * OAuth2: Token URL
   */
  @Column({ name: 'oauth2_token_url', type: 'varchar', length: 512, nullable: true })
  oauth2TokenUrl: string | null;

  /**
   * OAuth2: Scopes (JSON array)
   */
  @Column({ name: 'oauth2_scopes', type: 'jsonb', nullable: true })
  oauth2Scopes: string[] | null;

  /**
   * API Key: API Key value (encrypted)
   */
  @Column({ name: 'api_key', type: 'varchar', length: 512, nullable: true })
  apiKey: string | null;

  /**
   * API Key: API Secret (encrypted)
   */
  @Column({ name: 'api_secret', type: 'varchar', length: 512, nullable: true })
  apiSecret: string | null;

  /**
   * Basic Auth: Username
   */
  @Column({ name: 'basic_auth_username', type: 'varchar', length: 255, nullable: true })
  basicAuthUsername: string | null;

  /**
   * Basic Auth: Password (encrypted)
   */
  @Column({ name: 'basic_auth_password', type: 'varchar', length: 512, nullable: true })
  basicAuthPassword: string | null;

  /**
   * Webhook: Webhook URL
   */
  @Column({ name: 'webhook_url', type: 'varchar', length: 512, nullable: true })
  webhookUrl: string | null;

  /**
   * Webhook: Webhook Secret (for signature verification)
   */
  @Column({ name: 'webhook_secret', type: 'varchar', length: 512, nullable: true })
  webhookSecret: string | null;

  /**
   * Base URL for API calls
   */
  @Column({ name: 'base_url', type: 'varchar', length: 512, nullable: true })
  baseUrl: string | null;

  /**
   * Custom headers (JSON)
   */
  @Column({ name: 'custom_headers', type: 'jsonb', nullable: true })
  customHeaders: Record<string, string> | null;

  /**
   * Configuration (JSON) - provider-specific settings
   */
  @Column({ type: 'jsonb', nullable: true })
  configuration: Record<string, any> | null;

  /**
   * Last health check at
   */
  @Column({ name: 'last_health_check_at', type: 'timestamptz', nullable: true })
  lastHealthCheckAt: Date | null;

  /**
   * Last successful connection at
   */
  @Column({ name: 'last_successful_connection_at', type: 'timestamptz', nullable: true })
  lastSuccessfulConnectionAt: Date | null;

  /**
   * Last error message
   */
  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  /**
   * Error count
   */
  @Column({ name: 'error_count', type: 'integer', nullable: false, default: 0 })
  errorCount: number;

  /**
   * Integration health records
   */
  @OneToMany(() => IntegrationHealth, (health) => health.integration, {
    cascade: false,
    lazy: true,
  })
  healthRecords: Promise<IntegrationHealth[]> | IntegrationHealth[];

  /**
   * Additional metadata (JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: false })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: number | null;

  /**
   * Check if OAuth2 token is expired
   */
  isOAuth2TokenExpired(): boolean {
    if (!this.oauth2TokenExpiresAt) {
      return false;
    }
    return new Date() >= this.oauth2TokenExpiresAt;
  }

  /**
   * Check if integration needs token refresh
   */
  needsTokenRefresh(): boolean {
    if (this.integrationType !== IntegrationType.OAUTH2 || !this.oauth2TokenExpiresAt) {
      return false;
    }
    // Refresh if expires within 5 minutes
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return fiveMinutesFromNow >= this.oauth2TokenExpiresAt;
  }
}
