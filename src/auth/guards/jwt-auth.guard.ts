import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT Authentication Guard
 * Protects routes by requiring a valid JWT token
 * Can be bypassed using the @Public() decorator
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Check if route is marked as public
   * If public, skip authentication
   */
  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If public, skip authentication
    if (isPublic) {
      return true;
    }

    // Otherwise, use the default JWT authentication
    return super.canActivate(context);
  }

  /**
   * Handle authentication errors
   */
  handleRequest(err: any, user: any, info: any) {
    // If there's an error or no user, throw unauthorized exception
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or missing authentication token');
    }

    // If token validation failed, throw unauthorized exception
    if (info) {
      throw new UnauthorizedException(
        info.message || 'Token validation failed',
      );
    }

    return user;
  }
}

