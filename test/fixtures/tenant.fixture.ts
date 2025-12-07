import { DataSource } from 'typeorm';
import { Tenant } from '../../src/tenants/entities/tenant.entity';
import { TenantAdmin } from '../../src/tenants/entities/tenant-admin.entity';
import * as bcrypt from 'bcrypt';

/**
 * Tenant Fixtures
 * 
 * Factory functions for creating test tenant data
 */
export class TenantFixture {
  /**
   * Create a test tenant
   */
  static async createTenant(
    dataSource: DataSource,
    overrides: Partial<Tenant> = {},
  ): Promise<Tenant> {
    const tenantRepo = dataSource.getRepository(Tenant);
    
    const tenant = tenantRepo.create({
      key: overrides.key || `test_tenant_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: overrides.name || 'Test Tenant',
      status: overrides.status || 'active',
      subscriptionStatus: overrides.subscriptionStatus || 'active',
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides,
    });

    return await tenantRepo.save(tenant);
  }

  /**
   * Create a test tenant admin
   */
  static async createTenantAdmin(
    dataSource: DataSource,
    tenantId: number,
    overrides: Partial<TenantAdmin> = {},
  ): Promise<TenantAdmin> {
    const adminRepo = dataSource.getRepository(TenantAdmin);
    
    const password = overrides.password || 'TestPassword123!';
    const passwordHash = await bcrypt.hash(password, 10);

    const admin = adminRepo.create({
      tenantId,
      email: overrides.email || `admin_${Date.now()}@test.com`,
      passwordHash,
      fullName: overrides.fullName || 'Test Admin',
      active: overrides.active !== undefined ? overrides.active : true,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides,
    });

    return await adminRepo.save(admin);
  }

  /**
   * Create a tenant with admin
   */
  static async createTenantWithAdmin(
    dataSource: DataSource,
    tenantOverrides: Partial<Tenant> = {},
    adminOverrides: Partial<TenantAdmin> = {},
  ): Promise<{ tenant: Tenant; admin: TenantAdmin }> {
    const tenant = await this.createTenant(dataSource, tenantOverrides);
    const admin = await this.createTenantAdmin(dataSource, tenant.id, adminOverrides);

    return { tenant, admin };
  }

  /**
   * Create multiple test tenants
   */
  static async createTenants(
    dataSource: DataSource,
    count: number,
    overrides: Partial<Tenant> = {},
  ): Promise<Tenant[]> {
    const tenants: Tenant[] = [];
    for (let i = 0; i < count; i++) {
      const tenant = await this.createTenant(dataSource, {
        ...overrides,
        key: overrides.key || `test_tenant_${i}_${Date.now()}`,
        name: overrides.name || `Test Tenant ${i}`,
      });
      tenants.push(tenant);
    }
    return tenants;
  }
}

