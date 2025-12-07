import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../config/config.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { TokenService } from '../services/token.service';

/**
 * JWT Strategy for Passport
 * Validates JWT tokens from Authorization header
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: AppConfigService,
    private readonly tokenService: TokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.jwtSecret,
      passReqToCallback: false,
    });
  }

  /**
   * Validate JWT payload
   * This method is called by Passport after token verification
   * @param payload - Decoded JWT payload
   * @returns Validated user payload
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Verify token is still valid (double-check)
    if (!payload || !payload.userId || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Verify token hasn't expired (should be handled by Passport, but double-check)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new UnauthorizedException('Token has expired');
    }

    // Return the validated payload
    // This will be available in the request object via @CurrentUser() decorator
    return payload;
  }
}
