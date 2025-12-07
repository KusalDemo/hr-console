import { Module, Global } from '@nestjs/common';
import { CacheService } from './services/cache.service';
import { CacheInterceptor } from './interceptors/cache.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

/**
 * Caching Module
 * 
 * Provides distributed caching with Redis:
 * - Cache service with Redis integration
 * - Cache decorators for automatic caching
 * - Cache interceptor for method-level caching
 * - Cache invalidation strategies
 * - Cache warming
 * - TTL management
 * - Cache statistics
 * - Multi-level caching (L1 memory, L2 Redis)
 */
@Global()
@Module({
  providers: [
    CacheService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
  exports: [CacheService, CacheInterceptor],
})
export class CachingModule {}
