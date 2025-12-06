import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Timestamp in milliseconds
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Rate Limit Service
 * Implements in-memory rate limiting with sliding window
 * Can be enhanced with Redis for distributed rate limiting
 */
@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);

  // In-memory store for rate limits
  // Key format: "identifier:endpoint:method"
  private readonly rateLimitStore = new Map<string, RateLimitEntry>();

  // Configuration
  private readonly loginAttemptsPerWindow: number;
  private readonly loginWindowSeconds: number;
  private readonly refreshAttemptsPerWindow: number;
  private readonly refreshWindowSeconds: number;

  // Cleanup interval (remove expired entries)
  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly configService: AppConfigService) {
    // Default rate limits (can be configured via environment variables)
    this.loginAttemptsPerWindow = parseInt(
      process.env.RATE_LIMIT_LOGIN_ATTEMPTS || '5',
      10,
    );
    this.loginWindowSeconds = parseInt(
      process.env.RATE_LIMIT_LOGIN_WINDOW || '900', // 15 minutes
      10,
    );
    this.refreshAttemptsPerWindow = parseInt(
      process.env.RATE_LIMIT_REFRESH_ATTEMPTS || '10',
      10,
    );
    this.refreshWindowSeconds = parseInt(
      process.env.RATE_LIMIT_REFRESH_WINDOW || '60', // 1 minute
      10,
    );

    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  /**
   * Check rate limit for a request
   * @param identifier - Unique identifier (IP address or account email)
   * @param path - Request path
   * @param method - HTTP method
   * @returns Rate limit result
   */
  checkRateLimit(
    identifier: string,
    path: string,
    method: string,
  ): RateLimitResult {
    // Determine rate limit configuration based on endpoint
    const config = this.getRateLimitConfig(path);

    // Build cache key
    const key = `${identifier}:${path}:${method}`;

    // Get or create rate limit entry
    const entry = this.rateLimitStore.get(key) || this.createEntry(config.windowSeconds);

    const now = Date.now();

    // Check if window has expired
    if (now >= entry.resetTime) {
      // Reset the entry
      entry.count = 0;
      entry.resetTime = now + config.windowSeconds * 1000;
    }

    // Increment count
    entry.count++;

    // Update store
    this.rateLimitStore.set(key, entry);

    // Check if limit exceeded
    const allowed = entry.count <= config.maxAttempts;
    const remaining = Math.max(0, config.maxAttempts - entry.count);

    return {
      allowed,
      limit: config.maxAttempts,
      remaining,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Get rate limit configuration for endpoint
   */
  private getRateLimitConfig(path: string): {
    maxAttempts: number;
    windowSeconds: number;
  } {
    if (path.includes('/login')) {
      return {
        maxAttempts: this.loginAttemptsPerWindow,
        windowSeconds: this.loginWindowSeconds,
      };
    }

    if (path.includes('/refresh')) {
      return {
        maxAttempts: this.refreshAttemptsPerWindow,
        windowSeconds: this.refreshWindowSeconds,
      };
    }

    // Default configuration
    return {
      maxAttempts: 10,
      windowSeconds: 60,
    };
  }

  /**
   * Create a new rate limit entry
   */
  private createEntry(windowSeconds: number): RateLimitEntry {
    const now = Date.now();
    return {
      count: 0,
      resetTime: now + windowSeconds * 1000,
    };
  }

  /**
   * Clean up expired entries from the store
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now >= entry.resetTime) {
        this.rateLimitStore.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }

  /**
   * Reset rate limit for an identifier
   * Useful for testing or manual reset
   */
  resetRateLimit(identifier: string, path?: string): void {
    if (path) {
      // Reset specific endpoint
      const keysToDelete: string[] = [];
      for (const key of this.rateLimitStore.keys()) {
        if (key.startsWith(`${identifier}:${path}`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => this.rateLimitStore.delete(key));
    } else {
      // Reset all entries for identifier
      const keysToDelete: string[] = [];
      for (const key of this.rateLimitStore.keys()) {
        if (key.startsWith(`${identifier}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => this.rateLimitStore.delete(key));
    }
  }

  /**
   * Get current rate limit status for an identifier
   */
  getRateLimitStatus(
    identifier: string,
    path: string,
    method: string,
  ): RateLimitResult | null {
    const key = `${identifier}:${path}:${method}`;
    const entry = this.rateLimitStore.get(key);

    if (!entry) {
      const config = this.getRateLimitConfig(path);
      return {
        allowed: true,
        limit: config.maxAttempts,
        remaining: config.maxAttempts,
        resetTime: Date.now() + config.windowSeconds * 1000,
      };
    }

    const now = Date.now();
    const config = this.getRateLimitConfig(path);

    // Check if window has expired
    if (now >= entry.resetTime) {
      return {
        allowed: true,
        limit: config.maxAttempts,
        remaining: config.maxAttempts,
        resetTime: now + config.windowSeconds * 1000,
      };
    }

    const remaining = Math.max(0, config.maxAttempts - entry.count);
    return {
      allowed: entry.count <= config.maxAttempts,
      limit: config.maxAttempts,
      remaining,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.rateLimitStore.clear();
  }
}

