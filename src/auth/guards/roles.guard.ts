import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Roles Guard
 * Enforces role-based access control
 * - Checks if user has required roles
 * - Supports multiple roles (user needs at least one)
 * - Super admin bypass (super admin can access everything)
 * - Permission-based access structure (for future)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly SUPER_ADMIN_ROLE = 'ROLE_SUPER_ADMIN';

  constructor(private reflector: Reflector) {}

  /**
   * Check if user has required roles
   */
  canActivate(context: ExecutionContext): boolean {
    // Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (set by JWT guard)
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    // If no user, deny access (should be caught by JWT guard, but double-check)
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Super admin bypass - super admin can access everything
    if (this.isSuperAdmin(user)) {
      return true;
    }

    // Normalize required roles (add ROLE_ prefix if missing)
    const normalizedRequiredRoles = requiredRoles.map((role) => this.normalizeRole(role));

    // Get user roles
    const userRoles = user.roles || [];

    // Check if user has at least one of the required roles
    const hasRequiredRole = normalizedRequiredRoles.some((requiredRole) =>
      userRoles.includes(requiredRole),
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${normalizedRequiredRoles.join(', ')}. Your roles: ${userRoles.join(', ') || 'none'}`,
      );
    }

    return true;
  }

  /**
   * Check if user is super admin
   */
  private isSuperAdmin(user: JwtPayload): boolean {
    return (
      user.userType === 'SUPER_ADMIN' || (user.roles && user.roles.includes(this.SUPER_ADMIN_ROLE))
    );
  }

  /**
   * Normalize role name
   * Adds ROLE_ prefix if missing
   * @param role - Role name (with or without ROLE_ prefix)
   * @returns Normalized role name with ROLE_ prefix
   */
  private normalizeRole(role: string): string {
    if (!role) {
      return role;
    }

    // If already has ROLE_ prefix, return as is
    if (role.startsWith('ROLE_')) {
      return role.toUpperCase();
    }

    // Add ROLE_ prefix and uppercase
    return `ROLE_${role.toUpperCase()}`;
  }

  /**
   * Check if user has a specific role
   * Helper method for permission-based access (future use)
   */
  hasRole(user: JwtPayload, role: string): boolean {
    if (this.isSuperAdmin(user)) {
      return true;
    }

    const normalizedRole = this.normalizeRole(role);
    return user.roles?.includes(normalizedRole) || false;
  }

  /**
   * Check if user has any of the specified roles
   * Helper method for permission-based access (future use)
   */
  hasAnyRole(user: JwtPayload, roles: string[]): boolean {
    if (this.isSuperAdmin(user)) {
      return true;
    }

    return roles.some((role) => this.hasRole(user, role));
  }

  /**
   * Check if user has all of the specified roles
   * Helper method for permission-based access (future use)
   */
  hasAllRoles(user: JwtPayload, roles: string[]): boolean {
    if (this.isSuperAdmin(user)) {
      return true;
    }

    return roles.every((role) => this.hasRole(user, role));
  }
}
