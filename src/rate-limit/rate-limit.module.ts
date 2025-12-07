import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RateLimitService } from './services/rate-limit.service';
import { RateLimitConfigRepository } from './repositories/rate-limit-config.repository';
import { RateLimitConfig } from './entities/rate-limit-config.entity';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';
import { ConfigModule } from '../config/config.module';

/**
 * Rate Limit Module
 * 
 * Provides enhanced rate limiting with:
 * - Redis-based distributed rate limiting
 * - Configurable rate limit rules (per tenant, user, endpoint)
 * - Multiple strategies (token bucket, sliding window)
 * - Tiered limits (per minute, hour, day)
 * - Rate limit interceptor for global or per-route application
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([RateLimitConfig]),
    ConfigModule,
  ],
  providers: [
    RateLimitService,
    RateLimitConfigRepository,
    RateLimitInterceptor,
  ],
  exports: [
    RateLimitService,
    RateLimitConfigRepository,
    RateLimitInterceptor,
  ],
})
export class RateLimitModule {}
