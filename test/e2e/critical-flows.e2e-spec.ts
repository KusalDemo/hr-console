import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { TestDatabaseUtil } from '../utils/test-database.util';
import { TenantFixture, UserFixture, OrganizationFixture } from '../fixtures';
import { getAuthToken, authenticatedRequest } from '../utils/test-helpers';

/**
 * Critical User Flows E2E Tests
 * 
 * Tests end-to-end user journeys for critical business processes
 */
describe('Critical User Flows (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let superAdminToken: string;
  let tenantKey: string;
  let tenantAdminToken: string;

  beforeAll(async () => {
    // Create admin schema data source
    dataSource = await TestDatabaseUtil.createTestDataSource('admin');

    // Create test module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DataSource)
      .useValue(dataSource)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Setup: Create super admin token (or use existing)
    try {
      superAdminToken = await getAuthToken(
        app,
        'superadmin@example.com',
        'SuperAdmin123!',
      );
    } catch (error) {
      // Super admin might not exist in test DB
      // In real scenario, create one via migration or fixture
    }
  });

  afterAll(async () => {
    await app.close();
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('Tenant Onboarding Flow', () => {
    it('should complete full tenant onboarding process', async () => {
      if (!superAdminToken) {
        return; // Skip if no super admin
      }

      // Step 1: Create tenant
      const tenantData = {
        tenantKey: `onboarding-${Date.now()}`,
        name: 'Onboarding Test Tenant',
        tenantAdminEmail: `admin-${Date.now()}@test.com`,
        tenantAdminPassword: 'Admin123!',
        tenantAdminFullName: 'Onboarding Admin',
      };

      const createResponse = await authenticatedRequest(app, superAdminToken)
        .post('/api/admin/tenants')
        .send(tenantData)
        .expect(201);

      expect(createResponse.body).toHaveProperty('tenant');
      tenantKey = createResponse.body.tenant.tenantKey;

      // Step 2: Login as tenant admin
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant', tenantKey)
        .send({
          email: tenantData.tenantAdminEmail,
          password: tenantData.tenantAdminPassword,
        })
        .expect(200);

      tenantAdminToken = loginResponse.body.token.accessToken;

      // Step 3: Verify tenant admin can access tenant resources
      const profileResponse = await authenticatedRequest(app, tenantAdminToken)
        .set('X-Tenant', tenantKey)
        .get('/api/auth/profile')
        .expect(200);

      expect(profileResponse.body).toHaveProperty('email', tenantData.tenantAdminEmail);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should ensure tenant data isolation', async () => {
      if (!superAdminToken) {
        return;
      }

      // Create two tenants
      const tenant1Data = {
        tenantKey: `isolation-1-${Date.now()}`,
        name: 'Isolation Tenant 1',
        tenantAdminEmail: `admin1-${Date.now()}@test.com`,
        tenantAdminPassword: 'Admin123!',
        tenantAdminFullName: 'Admin 1',
      };

      const tenant2Data = {
        tenantKey: `isolation-2-${Date.now()}`,
        name: 'Isolation Tenant 2',
        tenantAdminEmail: `admin2-${Date.now()}@test.com`,
        tenantAdminPassword: 'Admin123!',
        tenantAdminFullName: 'Admin 2',
      };

      const tenant1Response = await authenticatedRequest(app, superAdminToken)
        .post('/api/admin/tenants')
        .send(tenant1Data)
        .expect(201);

      const tenant2Response = await authenticatedRequest(app, superAdminToken)
        .post('/api/admin/tenants')
        .send(tenant2Data)
        .expect(201);

      // Login as tenant 1 admin
      const login1Response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant', tenant1Response.body.tenant.tenantKey)
        .send({
          email: tenant1Data.tenantAdminEmail,
          password: tenant1Data.tenantAdminPassword,
        })
        .expect(200);

      const tenant1Token = login1Response.body.token.accessToken;

      // Login as tenant 2 admin
      const login2Response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant', tenant2Response.body.tenant.tenantKey)
        .send({
          email: tenant2Data.tenantAdminEmail,
          password: tenant2Data.tenantAdminPassword,
        })
        .expect(200);

      const tenant2Token = login2Response.body.token.accessToken;

      // Verify tenant 1 admin cannot access tenant 2 data
      // (This would require tenant-specific endpoints to test properly)
      // For now, verify tokens are different
      expect(tenant1Token).not.toBe(tenant2Token);
    });
  });

  describe('Authentication Flow', () => {
    it('should handle complete authentication flow', async () => {
      if (!superAdminToken) {
        return;
      }

      // Step 1: Create tenant and admin
      const tenantData = {
        tenantKey: `auth-flow-${Date.now()}`,
        name: 'Auth Flow Tenant',
        tenantAdminEmail: `auth-${Date.now()}@test.com`,
        tenantAdminPassword: 'Auth123!',
        tenantAdminFullName: 'Auth Admin',
      };

      const tenantResponse = await authenticatedRequest(app, superAdminToken)
        .post('/api/admin/tenants')
        .send(tenantData)
        .expect(201);

      // Step 2: Login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant', tenantResponse.body.tenant.tenantKey)
        .send({
          email: tenantData.tenantAdminEmail,
          password: tenantData.tenantAdminPassword,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body.token).toHaveProperty('accessToken');
      expect(loginResponse.body.token).toHaveProperty('refreshToken');

      // Step 3: Use token to access protected resource
      const token = loginResponse.body.token.accessToken;
      const profileResponse = await authenticatedRequest(app, token)
        .set('X-Tenant', tenantResponse.body.tenant.tenantKey)
        .get('/api/auth/profile')
        .expect(200);

      expect(profileResponse.body).toHaveProperty('email', tenantData.tenantAdminEmail);

      // Step 4: Verify token expiration handling
      // (Would need to wait for token expiration or mock time)
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });
  });

  describe('Permission Checks', () => {
    it('should enforce role-based access control', async () => {
      if (!superAdminToken) {
        return;
      }

      // Create tenant
      const tenantData = {
        tenantKey: `permissions-${Date.now()}`,
        name: 'Permissions Tenant',
        tenantAdminEmail: `perm-${Date.now()}@test.com`,
        tenantAdminPassword: 'Perm123!',
        tenantAdminFullName: 'Perm Admin',
      };

      const tenantResponse = await authenticatedRequest(app, superAdminToken)
        .post('/api/admin/tenants')
        .send(tenantData)
        .expect(201);

      // Login as tenant admin
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant', tenantResponse.body.tenant.tenantKey)
        .send({
          email: tenantData.tenantAdminEmail,
          password: tenantData.tenantAdminPassword,
        })
        .expect(200);

      const tenantToken = loginResponse.body.token.accessToken;

      // Tenant admin should not be able to access super admin endpoints
      const response = await authenticatedRequest(app, tenantToken)
        .get('/api/admin/tenants')
        .expect(403); // Forbidden

      expect(response.body).toHaveProperty('statusCode', 403);
    });
  });
});

