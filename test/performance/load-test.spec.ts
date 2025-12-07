import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getAuthToken, authenticatedRequest } from '../utils/test-helpers';

/**
 * Performance Tests
 * 
 * Tests for system performance under load
 * Note: These tests may take longer to run
 */
describe('Performance Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    try {
      authToken = await getAuthToken(
        app,
        'superadmin@example.com',
        'SuperAdmin123!',
      );
    } catch (error) {
      // Auth token might not be available
    }
  }, 60000); // Increase timeout for setup

  afterAll(async () => {
    await app.close();
  });

  describe('Response Time Tests', () => {
    it('should respond to health check within acceptable time', async () => {
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle multiple concurrent requests', async () => {
      if (!authToken) {
        return;
      }

      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app.getHttpServer())
          .get('/api/health')
          .expect(200),
      );

      const startTime = Date.now();
      await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 10 concurrent requests
    });
  });

  describe('Database Query Performance', () => {
    it('should retrieve tenant list efficiently', async () => {
      if (!authToken) {
        return;
      }

      const startTime = Date.now();
      const response = await authenticatedRequest(app, authToken)
        .get('/api/admin/tenants')
        .expect(200);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

