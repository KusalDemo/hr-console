import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../services/cache.service';
import { CACHE_METADATA_KEY, CacheOptions } from '../decorators/cache.decorator';

/**
 * Cache Interceptor
 *
 * Automatically caches method results based on @Cache() decorator.
 * Supports:
 * - Automatic caching of method results
 * - TTL management
 * - Cache invalidation
 * - Key generation from method parameters
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const cacheOptions = this.reflector.get<CacheOptions>(CACHE_METADATA_KEY, handler);

    // If no cache decorator, proceed normally
    if (!cacheOptions) {
      return next.handle();
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(
      cacheOptions.key || this.getDefaultCacheKey(context),
      request,
      context,
    );

    // Check if this is an invalidation operation
    if (cacheOptions.invalidate) {
      // Execute the method and invalidate cache
      return next.handle().pipe(
        tap(async () => {
          if (cacheOptions.invalidatePattern) {
            await this.cacheService.invalidate(
              cacheOptions.invalidatePattern,
              cacheOptions.namespace,
            );
          } else {
            await this.cacheService.delete(cacheKey, cacheOptions.namespace);
          }
        }),
      );
    }

    // Try to get from cache
    try {
      const cached = await this.cacheService.get(cacheKey, cacheOptions.namespace);
      if (cached !== null) {
        this.logger.debug(`Cache hit for key: ${cacheKey}`);
        return of(cached);
      }
    } catch (error) {
      this.logger.error(`Error getting cache for key ${cacheKey}:`, error);
    }

    // Cache miss, execute method and cache result
    return next.handle().pipe(
      tap(async (data) => {
        try {
          await this.cacheService.set(cacheKey, data, cacheOptions.ttl, cacheOptions.namespace);
          this.logger.debug(`Cached result for key: ${cacheKey}`);
        } catch (error) {
          this.logger.error(`Error setting cache for key ${cacheKey}:`, error);
        }
      }),
    );
  }

  /**
   * Generate cache key from template and request parameters
   */
  private generateCacheKey(keyTemplate: string, request: any, context: ExecutionContext): string {
    let cacheKey = keyTemplate;

    // Replace route parameters
    if (request.params) {
      Object.keys(request.params).forEach((param) => {
        cacheKey = cacheKey.replace(`:${param}`, request.params[param]);
        cacheKey = cacheKey.replace(`\${${param}}`, request.params[param]);
      });
    }

    // Replace query parameters
    if (request.query) {
      Object.keys(request.query).forEach((param) => {
        const value = request.query[param];
        if (value !== undefined && value !== null) {
          cacheKey = cacheKey.replace(`:${param}`, String(value));
          cacheKey = cacheKey.replace(`\${${param}}`, String(value));
        }
      });
    }

    // Replace user ID if available
    if (request.user?.userId) {
      cacheKey = cacheKey.replace(':userId', request.user.userId);
      cacheKey = cacheKey.replace('${userId}', request.user.userId);
    }

    // Replace tenant ID if available
    if (request.tenant?.id) {
      cacheKey = cacheKey.replace(':tenantId', request.tenant.id);
      cacheKey = cacheKey.replace('${tenantId}', request.tenant.id);
    }

    // Replace organization ID if available
    if (request.organization?.id) {
      cacheKey = cacheKey.replace(':organizationId', request.organization.id);
      cacheKey = cacheKey.replace('${organizationId}', request.organization.id);
    }

    return cacheKey;
  }

  /**
   * Get default cache key from context
   */
  private getDefaultCacheKey(context: ExecutionContext): string {
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;
    const request = context.switchToHttp().getRequest();

    let key = `${className}:${methodName}`;

    // Add route parameters
    if (request.params && Object.keys(request.params).length > 0) {
      const params = Object.values(request.params).join(':');
      key += `:${params}`;
    }

    // Add query parameters (sorted for consistency)
    if (request.query && Object.keys(request.query).length > 0) {
      const queryKeys = Object.keys(request.query).sort();
      const queryString = queryKeys.map((k) => `${k}=${request.query[k]}`).join('&');
      key += `:${queryString}`;
    }

    return key;
  }
}


