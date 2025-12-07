import { HttpException, HttpStatus } from '@nestjs/common';

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Not Found
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Conflict
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // Business Logic
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',

  // Tenant & Organization
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  TENANT_INACTIVE = 'TENANT_INACTIVE',
  ORGANIZATION_NOT_FOUND = 'ORGANIZATION_NOT_FOUND',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',

  // Server Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

export interface ErrorResponse {
  statusCode: number;
  errorCode: ErrorCode;
  message: string;
  details?: unknown;
  timestamp: string;
  path?: string;
}

export class BusinessException extends HttpException {
  constructor(
    errorCode: ErrorCode,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: unknown,
  ) {
    const response: ErrorResponse = {
      statusCode,
      errorCode,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
    super(response, statusCode);
  }
}

export class UnauthorizedException extends BusinessException {
  constructor(message = 'Unauthorized access', details?: unknown) {
    super(ErrorCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED, details);
  }
}

export class ForbiddenException extends BusinessException {
  constructor(message = 'Access forbidden', details?: unknown) {
    super(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN, details);
  }
}

export class NotFoundException extends BusinessException {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND, { resource, identifier });
  }
}

export class ConflictException extends BusinessException {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT, details);
  }
}

export class ValidationException extends BusinessException {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST, details);
  }
}
