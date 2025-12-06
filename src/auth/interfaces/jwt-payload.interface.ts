/**
 * JWT Payload interface
 * Contains all claims that will be included in the JWT token
 */
export interface JwtPayload {
  // Standard JWT claims
  sub: string; // Subject (user ID)
  email: string; // User email (UPN)
  preferred_username: string; // User's full name
  iat: number; // Issued at
  exp: number; // Expiration time

  // Custom claims
  userId: number; // User ID
  roles: string[]; // User roles (with ROLE_ prefix)
  tenant: string; // Tenant identifier ("admin" for super admin, tenant key for others)
  organizationId?: number; // Current organization ID (optional)
  organizationIds?: number[]; // All organization IDs user belongs to (optional)
  userType: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'USER'; // User type
}

/**
 * Token response interface
 */
export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number; // Expiration time in seconds
  tokenType: 'Bearer';
}

