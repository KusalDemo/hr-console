import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { RateLimitService } from '../services/rate-limit.service';
import { Reflector } from '@nestjs/core';

/**
 * Rate Limit Interceptor
 *
 * Applies rate limiting to requests based on configuration.
 * Can be applied globally or per-route using @UseInterceptors(RateLimitInterceptor)
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);

  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // Extract identifiers
    const identifier = this.extractIdentifier(request);
    const tenantId = this.extractTenantId(request);
    const userId = this.extractUserId(request);

    // Check rate limit
    const result = await this.rateLimitService.checkRateLimit(
      identifier,
      request.path,
      request.method,
      tenantId,
      userId,
    );

    // Add rate limit headers
    response.setHeader('X-RateLimit-Limit', result.limit.toString());
    response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    response.setHeader('X-RateLimit-Reset', result.resetTime.toString());

    if (!result.allowed) {
      this.logger.warn(
        `Rate limit exceeded: identifier=${identifier}, path=${request.path}, limit=${result.limit}`,
      );

      // Add Retry-After header
      response.setHeader('Retry-After', result.resetSeconds.toString());

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please try again after ${result.resetSeconds} seconds.`,
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.resetTime,
          resetSeconds: result.resetSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return next.handle();
  }

  /**
   * Extract identifier for rate limiting
   */
  private extractIdentifier(request: Request): string {
    // Try to get user ID from request (if authenticated)
    const user = (request as any).user;
    if (user?.userId) {
      return `user:${user.userId}`;
    }

    // Try to get email from request body (for login attempts)
    if (request.body && request.body.email) {
      return `account:${request.body.email.trim().toLowerCase()}`;
    }

    // Fall back to IP address
    const ipAddress =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['X-Forwarded-For'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      (request as any).connection?.remoteAddress ||
      'unknown';

    return `ip:${ipAddress}`;
  }

  /**
   * Extract tenant ID from request
   */
  private extractTenantId(request: Request): number | undefined {
    const tenantContext = (request as any).tenantContext;
    return tenantContext?.tenantId;
  }

  /**
   * Extract user ID from request
   */
  private extractUserId(request: Request): number | undefined {
    const user = (request as any).user;
    return user?.userId;
  }
}
