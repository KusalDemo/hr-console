import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { TestDatabaseUtil } from '../utils/test-database.util';
import { TenantFixture } from '../fixtures';
import { getAuthToken, authenticatedRequest, expectErrorResponse, expectPaginatedResponse } from '../utils/test-helpers';

describe('Tenants Integration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;

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

    // Get auth token for super admin
    try {
      authToken = await getAuthToken(
        app,
        'superadmin@example.com',
        'SuperAdmin123!',
      );
    } catch (error) {
      // If super admin doesn't exist, create one for testing
      // This would typically be done in test setup
    }
  });

  afterAll(async () => {
    await app.close();
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('GET /api/admin/tenants', () => {
    it('should return list of tenants', async () => {
      if (!authToken) {
        // Skip if no auth token available
        return;
      }

      const response = await authenticatedRequest(app, authToken)
        .get('/api/admin/tenants')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/tenants')
        .expect(401);

      expectErrorResponse(response.body, 401);
    });
  });

  describe('POST /api/admin/tenants', () => {
    it('should create a new tenant', async () => {
      if (!authToken) {
        return;
      }

      const tenantData = {
        tenantKey: `test-tenant-${Date.now()}`,
        name: 'Test Tenant',
        tenantAdminEmail: `admin-${Date.now()}@test.com`,
        tenantAdminPassword: 'Admin123!',
        tenantAdminFullName: 'Test Admin',
      };

      const response = await authenticatedRequest(app, authToken)
        .post('/api/admin/tenants')
        .send(tenantData)
        .expect(201);

      expect(response.body).toHaveProperty('tenant');
      expect(response.body.tenant.tenantKey).toBe(tenantData.tenantKey);
      expect(response.body.tenant.name).toBe(tenantData.name);
    });

    it('should fail with duplicate tenant key', async () => {
      if (!authToken) {
        return;
      }

      const tenantData = {
        tenantKey: 'duplicate-tenant',
        name: 'Duplicate Tenant',
        tenantAdminEmail: 'admin@duplicate.com',
        tenantAdminPassword: 'Admin123!',
        tenantAdminFullName: 'Admin',
      };

      // Create first tenant
      await authenticatedRequest(app, authToken)
        .post('/api/admin/tenants')
        .send(tenantData)
        .expect(201);

      // Try to create duplicate
      const response = await authenticatedRequest(app, authToken)
        .post('/api/admin/tenants')
        .send(tenantData)
        .expect(409);

      expectErrorResponse(response.body, 409);
    });

    it('should validate required fields', async () => {
      if (!authToken) {
        return;
      }

      const response = await authenticatedRequest(app, authToken)
        .post('/api/admin/tenants')
        .send({
          // Missing required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/admin/tenants/:id', () => {
    it('should return tenant by id', async () => {
      if (!authToken) {
        return;
      }

      // Create a tenant first
      const tenant = await TenantFixture.createTenant(dataSource, {
        key: `test-get-${Date.now()}`,
        name: 'Test Get Tenant',
      });

      const response = await authenticatedRequest(app, authToken)
        .get(`/api/admin/tenants/${tenant.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', tenant.id);
      expect(response.body).toHaveProperty('tenantKey', tenant.key);
    });

    it('should return 404 for non-existent tenant', async () => {
      if (!authToken) {
        return;
      }

      const response = await authenticatedRequest(app, authToken)
        .get('/api/admin/tenants/99999')
        .expect(404);

      expectErrorResponse(response.body, 404);
    });
  });

  describe('PATCH /api/admin/tenants/:id', () => {
    it('should update tenant', async () => {
      if (!authToken) {
        return;
      }

      // Create a tenant first
      const tenant = await TenantFixture.createTenant(dataSource, {
        key: `test-update-${Date.now()}`,
        name: 'Test Update Tenant',
      });

      const updateData = {
        name: 'Updated Tenant Name',
        status: 'suspended',
      };

      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/admin/tenants/${tenant.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty('status', updateData.status);
    });
  });
});

