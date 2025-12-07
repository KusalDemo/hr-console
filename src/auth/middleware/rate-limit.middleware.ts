import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimitService } from '../services/rate-limit.service';

/**
 * Rate Limiting Middleware for Authentication Endpoints
 * Implements IP-based and account-based throttling for login attempts
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  constructor(private readonly rateLimitService: RateLimitService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Only apply rate limiting to authentication endpoints
    if (!this.isAuthEndpoint(req.path)) {
      return next();
    }

    // Extract identifier for rate limiting
    const identifier = this.extractIdentifier(req);

    // Check rate limit
    const result = this.rateLimitService.checkRateLimit(identifier, req.path, req.method);

    // Add rate limit headers to response
    res.setHeader('X-RateLimit-Limit', result.limit.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', result.resetTime.toString());

    if (!result.allowed) {
      this.logger.warn(
        `Rate limit exceeded: identifier=${identifier}, path=${req.path}, limit=${result.limit}`,
      );

      // Add Retry-After header
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please try again after ${retryAfter} seconds.`,
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.resetTime,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  /**
   * Check if the request is to an authentication endpoint
   */
  private isAuthEndpoint(path: string): boolean {
    return path.startsWith('/auth/login') || path.startsWith('/auth/refresh');
  }

  /**
   * Extract identifier for rate limiting
   * Priority: Account (email) > IP Address
   */
  private extractIdentifier(req: Request): string {
    // Try to get email from request body (for login attempts)
    if (req.body && req.body.email) {
      return `account:${req.body.email.trim().toLowerCase()}`;
    }

    // Fall back to IP address
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['X-Forwarded-For'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      (req as any).connection?.remoteAddress ||
      'unknown';

    return `ip:${ipAddress}`;
  }
}
