import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '../services/tenant-context.service';

/**
 * Current Tenant decorator
 * Extracts the current tenant context from the request
 * The tenant context is set by the TenantContextMiddleware
 *
 * @example
 * // Get full tenant context
 * @Get('info')
 * getTenantInfo(@CurrentTenant() context: TenantContext) {
 *   return { tenantKey: context.tenantKey, schemaName: context.schemaName };
 * }
 *
 * @example
 * // Get specific property
 * @Get('key')
 * getTenantKey(@CurrentTenant('tenantKey') tenantKey: string) {
 *   return { tenantKey };
 * }
 *
 * @example
 * // Get tenant ID
 * @Get('id')
 * getTenantId(@CurrentTenant('tenantId') tenantId: number) {
 *   return { tenantId };
 * }
 */
export const CurrentTenant = createParamDecorator(
  (data: keyof TenantContext | undefined, ctx: ExecutionContext): TenantContext | any => {
    const request = ctx.switchToHttp().getRequest();

    // Get tenant context from request object (set by TenantContextMiddleware)
    const context: TenantContext | null = (request as any).tenantContext || null;

    // If no context, return null (will be handled by guards/middleware)
    if (!context) {
      return null;
    }

    // If a specific property is requested, return that property
    // Otherwise, return the entire context object
    return data ? context[data] : context;
  },
);

/**
 * Current Tenant Key decorator
 * Convenience decorator to extract just the tenant key
 *
 * @example
 * @Get('key')
 * getTenantKey(@CurrentTenantKey() tenantKey: string | null) {
 *   return { tenantKey };
 * }
 */
export const CurrentTenantKey = createParamDecorator(
  (data: undefined, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    const context: TenantContext | null = (request as any).tenantContext || null;
    return context?.tenantKey || null;
  },
);

/**
 * Current Tenant ID decorator
 * Convenience decorator to extract just the tenant ID
 *
 * @example
 * @Get('id')
 * getTenantId(@CurrentTenantId() tenantId: number | null) {
 *   return { tenantId };
 * }
 */
export const CurrentTenantId = createParamDecorator(
  (data: undefined, ctx: ExecutionContext): number | null => {
    const request = ctx.switchToHttp().getRequest();
    const context: TenantContext | null = (request as any).tenantContext || null;
    return context?.tenantId || null;
  },
);

/**
 * Current Schema Name decorator
 * Convenience decorator to extract just the schema name
 *
 * @example
 * @Get('schema')
 * getSchemaName(@CurrentSchemaName() schemaName: string) {
 *   return { schemaName };
 * }
 */
export const CurrentSchemaName = createParamDecorator(
  (data: undefined, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const context: TenantContext | null = (request as any).tenantContext || null;
    return context?.schemaName || 'admin';
  },
);
