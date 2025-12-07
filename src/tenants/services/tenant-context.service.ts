import { Injectable, Logger } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { TenantRepository } from '../../admin/repositories/tenant.repository';
import { Tenant } from '../../admin/entities/tenant.entity';

/**
 * Tenant context interface
 * Stores tenant information for the current request
 */
export interface TenantContext {
  tenantKey: string | null; // null for super admin, tenant key for others
  tenantId: number | null; // Tenant ID from database
  schemaName: string; // Schema name (admin or t_{tenantKey})
  isSuperAdmin: boolean; // Whether the user is a super admin
  tenant?: Tenant; // Full tenant entity (loaded when needed)
}

/**
 * Tenant Context Service
 * Manages tenant context using AsyncLocalStorage for request-scoped isolation
 *
 * This service provides:
 * - Tenant context management per request
 * - Current tenant resolution from JWT
 * - Schema name resolution
 * - Context validation
 */
@Injectable()
export class TenantContextService {
  private readonly logger = new Logger(TenantContextService.name);
  private readonly asyncLocalStorage = new AsyncLocalStorage<TenantContext>();

  constructor(private readonly tenantRepository: TenantRepository) {}

  /**
   * Run a function within a tenant context
   * @param context - Tenant context to set
   * @param fn - Function to run within the context
   * @returns Result of the function
   */
  async run<T>(context: TenantContext, fn: () => Promise<T>): Promise<T> {
    return this.asyncLocalStorage.run(context, fn);
  }

  /**
   * Run a synchronous function within a tenant context
   * @param context - Tenant context to set
   * @param fn - Function to run within the context
   * @returns Result of the function
   */
  runSync<T>(context: TenantContext, fn: () => T): T {
    return this.asyncLocalStorage.run(context, () => fn());
  }

  /**
   * Get the current tenant context
   * @returns Current tenant context or null if not set
   */
  getContext(): TenantContext | null {
    return this.asyncLocalStorage.getStore() || null;
  }

  /**
   * Get the current tenant key
   * @returns Current tenant key or null
   */
  getTenantKey(): string | null {
    const context = this.getContext();
    return context?.tenantKey || null;
  }

  /**
   * Get the current tenant ID
   * @returns Current tenant ID or null
   */
  getTenantId(): number | null {
    const context = this.getContext();
    return context?.tenantId || null;
  }

  /**
   * Get the current schema name
   * @returns Schema name (admin or t_{tenantKey})
   */
  getSchemaName(): string {
    const context = this.getContext();
    if (!context) {
      // Default to admin schema if no context is set
      return 'admin';
    }
    return context.schemaName;
  }

  /**
   * Check if current user is a super admin
   * @returns True if super admin, false otherwise
   */
  isSuperAdmin(): boolean {
    const context = this.getContext();
    return context?.isSuperAdmin || false;
  }

  /**
   * Get the current tenant entity
   * @returns Tenant entity or null
   */
  getTenant(): Tenant | null {
    const context = this.getContext();
    return context?.tenant || null;
  }

  /**
   * Create tenant context from JWT payload
   * @param payload - JWT payload containing tenant information
   * @returns Tenant context
   */
  async createContextFromJwt(payload: JwtPayload): Promise<TenantContext> {
    const isSuperAdmin = payload.userType === 'SUPER_ADMIN';
    const tenantKey = payload.tenant === 'admin' ? null : payload.tenant;

    // For super admin, use admin schema
    if (isSuperAdmin) {
      return {
        tenantKey: null,
        tenantId: null,
        schemaName: 'admin',
        isSuperAdmin: true,
      };
    }

    // For tenant admin and regular users, resolve tenant from database
    if (!tenantKey) {
      this.logger.warn('JWT payload missing tenant key for non-super-admin user');
      throw new Error('Tenant key is required for non-super-admin users');
    }

    // Load tenant from database
    const tenant = await this.tenantRepository.findByTenantKey(tenantKey, false);
    if (!tenant) {
      this.logger.error(`Tenant not found: ${tenantKey}`);
      throw new Error(`Tenant not found: ${tenantKey}`);
    }

    if (!tenant.isActive) {
      this.logger.warn(`Tenant is inactive: ${tenantKey}`);
      throw new Error(`Tenant is inactive: ${tenantKey}`);
    }

    return {
      tenantKey: tenant.tenantKey,
      tenantId: tenant.id,
      schemaName: this.resolveSchemaName(tenant.tenantKey),
      isSuperAdmin: false,
      tenant,
    };
  }

  /**
   * Create tenant context from tenant key
   * @param tenantKey - Tenant key
   * @returns Tenant context
   */
  async createContextFromTenantKey(tenantKey: string): Promise<TenantContext> {
    if (!tenantKey) {
      throw new Error('Tenant key is required');
    }

    // Load tenant from database
    const tenant = await this.tenantRepository.findByTenantKey(tenantKey, false);
    if (!tenant) {
      this.logger.error(`Tenant not found: ${tenantKey}`);
      throw new Error(`Tenant not found: ${tenantKey}`);
    }

    if (!tenant.isActive) {
      this.logger.warn(`Tenant is inactive: ${tenantKey}`);
      throw new Error(`Tenant is inactive: ${tenantKey}`);
    }

    return {
      tenantKey: tenant.tenantKey,
      tenantId: tenant.id,
      schemaName: this.resolveSchemaName(tenant.tenantKey),
      isSuperAdmin: false,
      tenant,
    };
  }

  /**
   * Create super admin context
   * @returns Super admin tenant context
   */
  createSuperAdminContext(): TenantContext {
    return {
      tenantKey: null,
      tenantId: null,
      schemaName: 'admin',
      isSuperAdmin: true,
    };
  }

  /**
   * Resolve schema name from tenant key
   * @param tenantKey - Tenant key
   * @returns Schema name in format t_{tenantKey}
   */
  resolveSchemaName(tenantKey: string | null): string {
    if (!tenantKey) {
      return 'admin';
    }
    return `t_${tenantKey.toLowerCase()}`;
  }

  /**
   * Validate tenant context
   * @param context - Tenant context to validate
   * @returns True if context is valid, false otherwise
   */
  validateContext(context: TenantContext | null): boolean {
    if (!context) {
      return false;
    }

    // Super admin context is always valid
    if (context.isSuperAdmin) {
      return context.schemaName === 'admin' && context.tenantKey === null;
    }

    // For non-super-admin, tenant key and schema name must be set
    if (!context.tenantKey) {
      return false;
    }

    // Schema name must match tenant key format
    const expectedSchemaName = this.resolveSchemaName(context.tenantKey);
    if (context.schemaName !== expectedSchemaName) {
      return false;
    }

    return true;
  }

  /**
   * Check if tenant context is set
   * @returns True if context is set, false otherwise
   */
  hasContext(): boolean {
    return this.getContext() !== null;
  }

  /**
   * Clear tenant context (for testing purposes)
   * Note: AsyncLocalStorage doesn't support clearing, but this can be used
   * to check if context exists before operations
   */
  requireContext(): TenantContext {
    const context = this.getContext();
    if (!context) {
      throw new Error('Tenant context is not set');
    }
    return context;
  }

  /**
   * Require tenant context (non-super-admin)
   * Throws error if context is not set or user is super admin
   */
  requireTenantContext(): TenantContext {
    const context = this.requireContext();
    if (context.isSuperAdmin) {
      throw new Error('Tenant context is required but user is super admin');
    }
    if (!context.tenantKey) {
      throw new Error('Tenant key is required');
    }
    return context;
  }
}
