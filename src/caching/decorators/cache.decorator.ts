import { SetMetadata } from '@nestjs/common';

/**
 * Cache Options
 */
export interface CacheOptions {
  /**
   * Cache key (can include parameters like :id, :userId)
   */
  key?: string;

  /**
   * Time to live in seconds
   */
  ttl?: number;

  /**
   * Cache namespace
   */
  namespace?: string;

  /**
   * Whether to invalidate cache on method execution
   */
  invalidate?: boolean;

  /**
   * Pattern to invalidate (for invalidate operations)
   */
  invalidatePattern?: string;
}

/**
 * Cache decorator metadata key
 */
export const CACHE_METADATA_KEY = 'cache:options';

/**
 * Cache decorator
 *
 * Usage:
 * @Cache({ key: 'user:${id}', ttl: 3600 })
 * async getUserById(id: number) { ... }
 */
export const Cache = (options: CacheOptions) => SetMetadata(CACHE_METADATA_KEY, options);

/**
 * Cache key decorator (for method parameters)
 *
 * Usage:
 * @CacheKey('user')
 * async getUserById(@Param('id') id: number) { ... }
 */
export const CacheKey = (key: string) => SetMetadata('cache:key', key);

/**
 * Cache TTL decorator
 *
 * Usage:
 * @CacheTTL(3600)
 * async getUserById(id: number) { ... }
 */
export const CacheTTL = (ttl: number) => SetMetadata('cache:ttl', ttl);

/**
 * Invalidate cache decorator
 *
 * Usage:
 * @InvalidateCache({ pattern: 'user:*' })
 * async updateUser(id: number) { ... }
 */
export const InvalidateCache = (options: { pattern?: string; namespace?: string }) =>
  SetMetadata('cache:invalidate', options);

