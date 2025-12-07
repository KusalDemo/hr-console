import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Cache Service
 *
 * Provides distributed caching with Redis:
 * - Get, set, delete operations
 * - TTL management
 * - Cache invalidation strategies
 * - Cache warming
 * - Cache statistics
 * - Multi-level caching (L1 memory, L2 Redis)
 */
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private memoryCache: Map<string, { value: any; expiresAt: number }> = new Map();
  private readonly memoryCacheEnabled: boolean;
  private readonly defaultTTL: number;
  private readonly namespace: string;

  constructor() {
    this.memoryCacheEnabled = process.env.CACHE_MEMORY_ENABLED === 'true' || true;
    this.defaultTTL = parseInt(process.env.CACHE_DEFAULT_TTL || '3600', 10); // 1 hour default
    this.namespace = process.env.CACHE_NAMESPACE || 'hr-saas';
  }

  async onModuleInit() {
    // Initialize Redis connection if configured
    const redisHost =
      process.env.REDIS_HOST || process.env.REDIS_HOSTS?.split('://')[1]?.split(':')[0];
    const redisPort = parseInt(
      process.env.REDIS_PORT || process.env.REDIS_HOSTS?.split(':').pop() || '6379',
      10,
    );
    const redisPassword = process.env.REDIS_PASSWORD;
    const redisUrl = process.env.REDIS_HOSTS || process.env.REDIS_URL;

    if (redisUrl || redisHost) {
      try {
        if (redisUrl) {
          this.redis = new Redis(redisUrl);
        } else {
          this.redis = new Redis({
            host: redisHost,
            port: redisPort,
            password: redisPassword,
            retryStrategy: (times) => {
              const delay = Math.min(times * 50, 2000);
              return delay;
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            enableOfflineQueue: false,
          });
        }

        this.redis.on('error', (error) => {
          this.logger.error('Redis connection error:', error);
        });

        this.redis.on('connect', () => {
          this.logger.log('Redis connected successfully for caching');
        });

        this.redis.on('ready', () => {
          this.logger.log('Redis ready for caching operations');
        });

        // Test connection
        await this.redis.ping();
        this.logger.log('Redis caching enabled');
      } catch (error) {
        this.logger.warn('Redis not available, falling back to in-memory caching only', error);
        this.redis = null;
      }
    } else {
      this.logger.warn('Redis not configured, using in-memory caching only');
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
    this.memoryCache.clear();
  }

  /**
   * Build cache key with namespace
   */
  private buildKey(key: string, namespace?: string): string {
    const ns = namespace || this.namespace;
    return `${ns}:${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, namespace?: string): Promise<T | null> {
    const cacheKey = this.buildKey(key, namespace);

    // Try memory cache first (L1)
    if (this.memoryCacheEnabled) {
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry) {
        if (memoryEntry.expiresAt > Date.now()) {
          return memoryEntry.value as T;
        } else {
          // Expired, remove from memory
          this.memoryCache.delete(cacheKey);
        }
      }
    }

    // Try Redis cache (L2)
    if (this.redis) {
      try {
        const value = await this.redis.get(cacheKey);
        if (value) {
          const parsed = JSON.parse(value) as T;

          // Update memory cache if enabled
          if (this.memoryCacheEnabled) {
            const ttl = await this.redis.ttl(cacheKey);
            if (ttl > 0) {
              this.memoryCache.set(cacheKey, {
                value: parsed,
                expiresAt: Date.now() + ttl * 1000,
              });
            }
          }

          return parsed;
        }
      } catch (error) {
        this.logger.error(`Error getting cache key ${cacheKey}:`, error);
      }
    }

    return null;
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttlSeconds?: number, namespace?: string): Promise<void> {
    const cacheKey = this.buildKey(key, namespace);
    const ttl = ttlSeconds || this.defaultTTL;

    // Set in memory cache (L1)
    if (this.memoryCacheEnabled) {
      this.memoryCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + ttl * 1000,
      });
    }

    // Set in Redis cache (L2)
    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, ttl, JSON.stringify(value));
      } catch (error) {
        this.logger.error(`Error setting cache key ${cacheKey}:`, error);
      }
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, namespace?: string): Promise<void> {
    const cacheKey = this.buildKey(key, namespace);

    // Delete from memory cache
    if (this.memoryCacheEnabled) {
      this.memoryCache.delete(cacheKey);
    }

    // Delete from Redis cache
    if (this.redis) {
      try {
        await this.redis.del(cacheKey);
      } catch (error) {
        this.logger.error(`Error deleting cache key ${cacheKey}:`, error);
      }
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern: string, namespace?: string): Promise<void> {
    const cachePattern = this.buildKey(pattern, namespace);

    // Delete from memory cache
    if (this.memoryCacheEnabled) {
      const keysToDelete: string[] = [];
      for (const key of this.memoryCache.keys()) {
        if (this.matchPattern(key, cachePattern)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => this.memoryCache.delete(key));
    }

    // Delete from Redis cache
    if (this.redis) {
      try {
        const keys = await this.redis.keys(cachePattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        this.logger.error(`Error deleting cache pattern ${cachePattern}:`, error);
      }
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string, namespace?: string): Promise<boolean> {
    const cacheKey = this.buildKey(key, namespace);

    // Check memory cache
    if (this.memoryCacheEnabled) {
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
        return true;
      }
    }

    // Check Redis cache
    if (this.redis) {
      try {
        const exists = await this.redis.exists(cacheKey);
        return exists === 1;
      } catch (error) {
        this.logger.error(`Error checking cache key ${cacheKey}:`, error);
      }
    }

    return false;
  }

  /**
   * Get or set value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number,
    namespace?: string,
  ): Promise<T> {
    const cached = await this.get<T>(key, namespace);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttlSeconds, namespace);
    return value;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string, namespace?: string): Promise<void> {
    await this.deletePattern(pattern, namespace);
  }

  /**
   * Clear all cache (use with caution)
   */
  async clear(namespace?: string): Promise<void> {
    const cachePattern = namespace ? this.buildKey('*', namespace) : `${this.namespace}:*`;

    await this.deletePattern('*', namespace);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryCacheSize: number;
    redisConnected: boolean;
    redisInfo?: Record<string, any>;
  }> {
    const stats: any = {
      memoryCacheSize: this.memoryCache.size,
      redisConnected: this.redis !== null && this.redis.status === 'ready',
    };

    if (this.redis && this.redis.status === 'ready') {
      try {
        const info = await this.redis.info('stats');
        stats.redisInfo = this.parseRedisInfo(info);
      } catch (error) {
        this.logger.error('Error getting Redis stats:', error);
      }
    }

    return stats;
  }

  /**
   * Parse Redis INFO command output
   */
  private parseRedisInfo(info: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line && !line.startsWith('#') && line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }
    return result;
  }

  /**
   * Match pattern (simple glob matching)
   */
  private matchPattern(key: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    return regex.test(key);
  }

  /**
   * Get TTL for a key
   */
  async getTTL(key: string, namespace?: string): Promise<number> {
    const cacheKey = this.buildKey(key, namespace);

    if (this.redis) {
      try {
        return await this.redis.ttl(cacheKey);
      } catch (error) {
        this.logger.error(`Error getting TTL for key ${cacheKey}:`, error);
      }
    }

    // Check memory cache
    if (this.memoryCacheEnabled) {
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry) {
        const remaining = Math.floor((memoryEntry.expiresAt - Date.now()) / 1000);
        return remaining > 0 ? remaining : -1;
      }
    }

    return -1;
  }

  /**
   * Extend TTL for a key
   */
  async extendTTL(key: string, ttlSeconds: number, namespace?: string): Promise<void> {
    const cacheKey = this.buildKey(key, namespace);

    if (this.redis) {
      try {
        await this.redis.expire(cacheKey, ttlSeconds);
      } catch (error) {
        this.logger.error(`Error extending TTL for key ${cacheKey}:`, error);
      }
    }

    // Update memory cache TTL
    if (this.memoryCacheEnabled) {
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry) {
        memoryEntry.expiresAt = Date.now() + ttlSeconds * 1000;
      }
    }
  }
}
