import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RateLimitConfig, RateLimitScopeType } from '../entities/rate-limit-config.entity';

/**
 * Rate Limit Config Repository
 *
 * Provides custom queries for rate limit configuration operations
 */
@Injectable()
export class RateLimitConfigRepository extends Repository<RateLimitConfig> {
  constructor(private dataSource: DataSource) {
    super(RateLimitConfig, dataSource.createEntityManager());
  }

  /**
   * Find config by key
   */
  async findByKey(configKey: string): Promise<RateLimitConfig | null> {
    return this.findOne({
      where: { configKey },
    });
  }

  /**
   * Find config by ID
   */
  async findById(id: number): Promise<RateLimitConfig | null> {
    return this.findOne({
      where: { id },
    });
  }

  /**
   * Find active configs for a scope
   */
  async findActiveByScope(
    scopeType: RateLimitScopeType,
    scopeId?: number,
  ): Promise<RateLimitConfig[]> {
    const where: any = {
      scopeType,
      isActive: true,
    };

    if (scopeId !== undefined) {
      where.scopeId = scopeId;
    }

    return this.find({
      where,
      order: {
        priority: 'DESC', // Higher priority first
      },
    });
  }

  /**
   * Find applicable configs for a request
   * Returns configs ordered by priority (most specific first)
   */
  async findApplicableConfigs(
    path: string,
    method: string,
    tenantId?: number,
    userId?: number,
  ): Promise<RateLimitConfig[]> {
    const configs: RateLimitConfig[] = [];

    // Get all active configs
    const allConfigs = await this.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });

    for (const config of allConfigs) {
      // Check if config applies to this request
      if (this.configApplies(config, path, method, tenantId, userId)) {
        configs.push(config);
      }
    }

    return configs;
  }

  /**
   * Check if a config applies to a request
   */
  private configApplies(
    config: RateLimitConfig,
    path: string,
    method: string,
    tenantId?: number,
    userId?: number,
  ): boolean {
    // Check scope type
    switch (config.scopeType) {
      case RateLimitScopeType.GLOBAL:
        // Global configs apply to all requests
        break;

      case RateLimitScopeType.TENANT:
        // Tenant configs only apply if tenantId matches
        if (!tenantId || config.scopeId !== tenantId) {
          return false;
        }
        break;

      case RateLimitScopeType.USER:
        // User configs only apply if userId matches
        if (!userId || config.scopeId !== userId) {
          return false;
        }
        break;

      case RateLimitScopeType.ENDPOINT:
        // Endpoint configs need pattern matching
        if (!this.matchesEndpointPattern(config.endpointPattern, path, method)) {
          return false;
        }
        break;
    }

    // If endpoint pattern is specified, check if it matches
    if (
      config.endpointPattern &&
      !this.matchesEndpointPattern(config.endpointPattern, path, method)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Check if path/method matches endpoint pattern
   */
  private matchesEndpointPattern(pattern: string | null, path: string, method: string): boolean {
    if (!pattern) {
      return true; // No pattern means match all
    }

    // Pattern format: "METHOD:/path/*" or "/path/*"
    const patternParts = pattern.split(':');
    let patternMethod: string | null = null;
    let patternPath: string;

    if (patternParts.length === 2) {
      patternMethod = patternParts[0].trim().toUpperCase();
      patternPath = patternParts[1].trim();
    } else {
      patternPath = pattern.trim();
    }

    // Check method if specified
    if (patternMethod && patternMethod !== method.toUpperCase()) {
      return false;
    }

    // Convert pattern to regex
    const regexPattern = patternPath.replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);

    return regex.test(path);
  }
}
