import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../../config/config.service';
import { JwtPayload, TokenResponse } from '../interfaces/jwt-payload.interface';

export interface TokenGenerationOptions {
  userId: number;
  email: string;
  fullName: string;
  roles: string[];
  tenant: string;
  organizationId?: number;
  organizationIds?: number[];
  userType: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'USER';
}

/**
 * Service for JWT token generation and management
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
  ) {}

  /**
   * Generate access token
   * @param options - Token generation options
   * @returns Access token string
   */
  generateAccessToken(options: TokenGenerationOptions): string {
    const payload: JwtPayload = {
      sub: options.userId.toString(),
      email: options.email,
      preferred_username: options.fullName,
      userId: options.userId,
      roles: options.roles,
      tenant: options.tenant,
      organizationId: options.organizationId,
      organizationIds: options.organizationIds,
      userType: options.userType,
      iat: Math.floor(Date.now() / 1000),
      exp: this.getAccessTokenExpiration(),
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.jwtSecret,
    });
  }

  /**
   * Generate refresh token
   * @param options - Token generation options
   * @returns Refresh token string
   */
  generateRefreshToken(options: TokenGenerationOptions): string {
    const payload: Partial<JwtPayload> = {
      sub: options.userId.toString(),
      email: options.email,
      userId: options.userId,
      tenant: options.tenant,
      userType: options.userType,
      iat: Math.floor(Date.now() / 1000),
      exp: this.getRefreshTokenExpiration(),
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.jwtRefreshSecret,
    });
  }

  /**
   * Generate both access and refresh tokens
   * @param options - Token generation options
   * @returns Token response with both tokens
   */
  generateTokenPair(options: TokenGenerationOptions): TokenResponse {
    const accessToken = this.generateAccessToken(options);
    const refreshToken = this.generateRefreshToken(options);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getAccessTokenExpirationSeconds(),
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify access token
   * @param token - Access token to verify
   * @returns Decoded payload or null if invalid
   */
  verifyAccessToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.jwtSecret,
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify refresh token
   * @param token - Refresh token to verify
   * @returns Decoded payload or null if invalid
   */
  verifyRefreshToken(token: string): Partial<JwtPayload> | null {
    try {
      return this.jwtService.verify<Partial<JwtPayload>>(token, {
        secret: this.configService.jwtRefreshSecret,
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Decode token without verification (for inspection)
   * @param token - Token to decode
   * @returns Decoded payload or null
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode<JwtPayload>(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get access token expiration timestamp
   * @returns Expiration timestamp in seconds
   */
  private getAccessTokenExpiration(): number {
    const expiresIn = this.parseExpirationTime(this.configService.jwtExpiresIn);
    return Math.floor(Date.now() / 1000) + expiresIn;
  }

  /**
   * Get refresh token expiration timestamp
   * @returns Expiration timestamp in seconds
   */
  private getRefreshTokenExpiration(): number {
    const expiresIn = this.parseExpirationTime(this.configService.jwtRefreshExpiresIn);
    return Math.floor(Date.now() / 1000) + expiresIn;
  }

  /**
   * Get access token expiration in seconds
   * @returns Expiration time in seconds
   */
  private getAccessTokenExpirationSeconds(): number {
    return this.parseExpirationTime(this.configService.jwtExpiresIn);
  }

  /**
   * Parse expiration time string to seconds
   * Supports: "15m", "1h", "7d", "30s", etc.
   * @param expiresIn - Expiration time string
   * @returns Expiration time in seconds
   */
  private parseExpirationTime(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Default to 15 minutes if format is invalid
      return 15 * 60;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 15 * 60; // Default to 15 minutes
    }
  }
}
