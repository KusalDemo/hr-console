import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

/**
 * Test Helpers
 * 
 * Common utilities for testing NestJS applications
 */

/**
 * Get authentication token for a user
 */
export async function getAuthToken(
  app: INestApplication,
  email: string,
  password: string,
  tenantKey?: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .set(tenantKey ? { 'X-Tenant': tenantKey } : {})
    .send({ email, password })
    .expect(200);

  return response.body.token.accessToken;
}

/**
 * Create authenticated request helper
 * Returns a function that creates authenticated requests
 */
export function authenticatedRequest(
  app: INestApplication,
  token: string,
  tenantKey?: string,
) {
  const server = request(app.getHttpServer());
  return {
    get: (url: string) => {
      const req = server.get(url);
      req.set('Authorization', `Bearer ${token}`);
      if (tenantKey) {
        req.set('X-Tenant', tenantKey);
      }
      return req;
    },
    post: (url: string) => {
      const req = server.post(url);
      req.set('Authorization', `Bearer ${token}`);
      if (tenantKey) {
        req.set('X-Tenant', tenantKey);
      }
      return req;
    },
    patch: (url: string) => {
      const req = server.patch(url);
      req.set('Authorization', `Bearer ${token}`);
      if (tenantKey) {
        req.set('X-Tenant', tenantKey);
      }
      return req;
    },
    put: (url: string) => {
      const req = server.put(url);
      req.set('Authorization', `Bearer ${token}`);
      if (tenantKey) {
        req.set('X-Tenant', tenantKey);
      }
      return req;
    },
    delete: (url: string) => {
      const req = server.delete(url);
      req.set('Authorization', `Bearer ${token}`);
      if (tenantKey) {
        req.set('X-Tenant', tenantKey);
      }
      return req;
    },
  };
}

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a test transaction wrapper
 */
export async function withTransaction<T>(
  dataSource: DataSource,
  callback: (queryRunner: any) => Promise<T>,
): Promise<T> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const result = await callback(queryRunner);
    await queryRunner.rollbackTransaction();
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Generate random email for testing
 */
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}@test.com`;
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Create pagination query params
 */
export function createPaginationParams(page: number = 1, limit: number = 10) {
  return { page, limit };
}

/**
 * Assert error response structure
 */
export function expectErrorResponse(body: any, statusCode: number, message?: string) {
  expect(body).toHaveProperty('statusCode', statusCode);
  expect(body).toHaveProperty('message');
  if (message) {
    expect(body.message).toContain(message);
  }
  expect(body).toHaveProperty('timestamp');
  expect(body).toHaveProperty('path');
}

/**
 * Assert paginated response structure
 */
export function expectPaginatedResponse(body: any) {
  expect(body).toHaveProperty('data');
  expect(body).toHaveProperty('meta');
  expect(body.meta).toHaveProperty('page');
  expect(body.meta).toHaveProperty('limit');
  expect(body.meta).toHaveProperty('total');
  expect(body.meta).toHaveProperty('totalPages');
}

/**
 * Mock date for testing
 */
export function mockDate(date: Date): () => void {
  const originalDate = Date;
  const mockDate = jest.fn(() => date) as any;
  mockDate.now = jest.fn(() => date.getTime());
  mockDate.parse = originalDate.parse;
  mockDate.UTC = originalDate.UTC;
  global.Date = mockDate as any;

  return () => {
    global.Date = originalDate;
  };
}
