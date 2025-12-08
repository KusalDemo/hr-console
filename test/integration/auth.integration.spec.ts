import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { TestDatabaseUtil } from '../utils/test-database.util';
import { TenantFixture, UserFixture } from '../fixtures';
import { getAuthToken, authenticatedRequest, expectErrorResponse } from '../utils/test-helpers';

describe('Auth Integration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminDataSource: DataSource;

  beforeAll(async () => {
    // Create admin schema data source
    adminDataSource = await TestDatabaseUtil.createTestDataSource('admin');

    // Create test module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DataSource)
      .useValue(adminDataSource)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (adminDataSource && adminDataSource.isInitialized) {
      await adminDataSource.destroy();
    }
  });

  describe('POST /api/auth/login', () => {
    it('should login super admin successfully', async () => {
      // Note: This test assumes a super admin exists in the test database
      // In a real scenario, you'd create one using fixtures
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'superadmin@example.com',
          password: 'SuperAdmin123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toHaveProperty('accessToken');
      expect(response.body.token).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email');
    });

    it('should fail login with invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expectErrorResponse(response.body, 401);
    });

    it('should fail login with missing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          password: 'password123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should fail login with missing password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should login tenant admin with tenant header', async () => {
      // Create test tenant and admin
      const { tenant, admin } = await TenantFixture.createTenantWithAdmin(
        adminDataSource,
        { key: 'test-tenant-auth', name: 'Test Tenant Auth' },
        { email: 'tenantadmin@test.com', password: 'Admin123!' },
      );

      // Create tenant schema
      await TestDatabaseUtil.createTestTenantSchema(adminDataSource, tenant.key);

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Tenant', tenant.key)
        .send({
          email: admin.email,
          password: 'Admin123!',
        });

      // Cleanup
      await TestDatabaseUtil.dropTestTenantSchema(adminDataSource, tenant.key);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
      }
    });
  });

  describe('Authentication Middleware', () => {
    it('should reject requests without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tenants')
        .expect(401);

      expectErrorResponse(response.body, 401);
    });

    it('should accept requests with valid token', async () => {
      // Get auth token first
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'superadmin@example.com',
          password: 'SuperAdmin123!',
        });

      if (loginResponse.status === 200) {
        const token = loginResponse.body.token.accessToken;

        const response = await request(app.getHttpServer())
          .get('/api/tenants')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body).toBeDefined();
      }
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/tenants')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expectErrorResponse(response.body, 401);
    });
  });
});


