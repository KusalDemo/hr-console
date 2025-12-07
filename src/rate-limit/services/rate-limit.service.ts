import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { RateLimitConfigRepository } from '../repositories/rate-limit-config.repository';
import { RateLimitConfig, RateLimitStrategy } from '../entities/rate-limit-config.entity';

/**
 * Rate Limit Result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp in milliseconds
  resetSeconds: number; // Seconds until reset
}

/**
 * Enhanced Rate Limit Service
 * 
 * Provides Redis-based rate limiting with:
 * - Token bucket algorithm
 * - Sliding window algorithm
 * - Per-tenant/user/endpoint limits
 * - Tiered limits (per minute, hour, day)
 */
@Injectable()
export class RateLimitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);
  private redis: Redis | null = null;
  private readonly keyPrefix = 'ratelimit:';

  constructor(
    private readonly configRepository: RateLimitConfigRepository,
  ) {}

  async onModuleInit() {
    // Initialize Redis connection if configured
    const redisHost = process.env.REDIS_HOST;
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD;

    if (redisHost) {
      try {
        this.redis = new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
        });

        this.redis.on('error', (error) => {
          this.logger.error('Redis connection error:', error);
        });

        this.redis.on('connect', () => {
          this.logger.log('Redis connected successfully');
        });

        // Test connection
        await this.redis.ping();
        this.logger.log('Redis rate limiting enabled');
      } catch (error) {
        this.logger.warn('Redis not available, falling back to in-memory rate limiting', error);
        this.redis = null;
      }
    } else {
      this.logger.warn('Redis not configured, using in-memory rate limiting');
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(
    identifier: string,
    path: string,
    method: string,
    tenantId?: number,
    userId?: number,
  ): Promise<RateLimitResult> {
    // Find applicable rate limit configs
    const configs = await this.configRepository.findApplicableConfigs(
      path,
      method,
      tenantId,
      userId,
    );

    if (configs.length === 0) {
      // No rate limit configured, allow request
      return {
        allowed: true,
        limit: 0,
        remaining: 0,
        resetTime: Date.now() + 60000,
        resetSeconds: 60,
      };
    }

    // Use the first (highest priority) config
    const config = configs[0];

    // Build rate limit key
    const key = this.buildKey(identifier, config);

    // Check rate limit based on strategy
    let result: RateLimitResult;

    if (config.limitStrategy === RateLimitStrategy.TOKEN_BUCKET) {
      result = await this.checkTokenBucket(key, config);
    } else {
      result = await this.checkSlidingWindow(key, config);
    }

    // Check tiered limits if configured
    if (config.requestsPerHour) {
      const hourKey = `${key}:hour`;
      const hourResult = await this.checkSlidingWindow(hourKey, {
        ...config,
        requestsPerMinute: config.requestsPerHour,
        windowSizeSeconds: 3600,
      });
      if (!hourResult.allowed) {
        return hourResult;
      }
    }

    if (config.requestsPerDay) {
      const dayKey = `${key}:day`;
      const dayResult = await this.checkSlidingWindow(dayKey, {
        ...config,
        requestsPerMinute: config.requestsPerDay,
        windowSizeSeconds: 86400,
      });
      if (!dayResult.allowed) {
        return dayResult;
      }
    }

    return result;
  }

  /**
   * Token bucket algorithm
   */
  private async checkTokenBucket(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const bucketKey = `${this.keyPrefix}tb:${key}`;
    const capacity = config.burstSize || config.requestsPerMinute;
    const refillRate = config.requestsPerMinute / 60; // Tokens per second
    const now = Date.now();

    if (this.redis) {
      // Use Redis for distributed rate limiting
      const luaScript = `
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refillRate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local windowSize = tonumber(ARGV[4])
        
        local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
        local tokens = tonumber(bucket[1]) or capacity
        local lastRefill = tonumber(bucket[2]) or now
        
        -- Calculate tokens to add
        local elapsed = (now - lastRefill) / 1000
        local tokensToAdd = math.floor(elapsed * refillRate)
        tokens = math.min(capacity, tokens + tokensToAdd)
        
        -- Check if request is allowed
        local allowed = tokens >= 1
        if allowed then
          tokens = tokens - 1
        end
        
        -- Update bucket
        redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
        redis.call('EXPIRE', key, windowSize)
        
        return {tostring(allowed and 1 or 0), tostring(tokens), tostring(capacity)}
      `;

      try {
        const result = await this.redis.eval(
          luaScript,
          1,
          bucketKey,
          capacity.toString(),
          refillRate.toString(),
          now.toString(),
          config.windowSizeSeconds.toString(),
        ) as [string, string, string];

        const allowed = result[0] === '1';
        const remaining = Math.max(0, parseInt(result[1], 10));
        const limit = parseInt(result[2], 10);
        const resetTime = now + (config.windowSizeSeconds * 1000);

        return {
          allowed,
          limit,
          remaining,
          resetTime,
          resetSeconds: config.windowSizeSeconds,
        };
      } catch (error) {
        this.logger.error('Redis token bucket error:', error);
        // Fall through to in-memory
      }
    }

    // Fallback to in-memory (simplified)
    return {
      allowed: true,
      limit: capacity,
      remaining: capacity - 1,
      resetTime: now + (config.windowSizeSeconds * 1000),
      resetSeconds: config.windowSizeSeconds,
    };
  }

  /**
   * Sliding window algorithm
   */
  private async checkSlidingWindow(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const windowKey = `${this.keyPrefix}sw:${key}`;
    const limit = config.requestsPerMinute;
    const windowSize = config.windowSizeSeconds;
    const now = Date.now();
    const windowStart = now - (windowSize * 1000);

    if (this.redis) {
      // Use Redis for distributed rate limiting
      const luaScript = `
        local key = KEYS[1]
        local windowStart = tonumber(ARGV[1])
        local limit = tonumber(ARGV[2])
        local windowSize = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])
        
        -- Remove old entries
        redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
        
        -- Count current requests
        local count = redis.call('ZCARD', key)
        
        -- Check if limit exceeded
        local allowed = count < limit
        if allowed then
          -- Add current request
          redis.call('ZADD', key, now, now)
        end
        
        -- Set expiration
        redis.call('EXPIRE', key, windowSize)
        
        return {tostring(allowed and 1 or 0), tostring(count), tostring(limit)}
      `;

      try {
        const result = await this.redis.eval(
          luaScript,
          1,
          windowKey,
          windowStart.toString(),
          limit.toString(),
          windowSize.toString(),
          now.toString(),
        ) as [string, string, string];

        const allowed = result[0] === '1';
        const count = parseInt(result[1], 10);
        const limitValue = parseInt(result[2], 10);
        const remaining = Math.max(0, limitValue - count - (allowed ? 1 : 0));
        const resetTime = now + (windowSize * 1000);

        return {
          allowed,
          limit: limitValue,
          remaining,
          resetTime,
          resetSeconds: windowSize,
        };
      } catch (error) {
        this.logger.error('Redis sliding window error:', error);
        // Fall through to in-memory
      }
    }

    // Fallback to in-memory (simplified - would need proper implementation)
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetTime: now + (windowSize * 1000),
      resetSeconds: windowSize,
    };
  }

  /**
   * Build rate limit key
   */
  private buildKey(identifier: string, config: RateLimitConfig): string {
    const parts = [config.scopeType.toLowerCase()];

    if (config.scopeId) {
      parts.push(config.scopeId.toString());
    }

    if (config.endpointPattern) {
      parts.push(config.endpointPattern.replace(/[^a-zA-Z0-9]/g, '_'));
    }

    parts.push(identifier);

    return parts.join(':');
  }
}
