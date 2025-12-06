import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode, ErrorResponse } from '../exceptions/business.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorResponse: ErrorResponse;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && 'errorCode' in exceptionResponse) {
        // Business exception with error code
        errorResponse = exceptionResponse as ErrorResponse;
      } else {
        // Standard NestJS HttpException
        const message =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as { message?: string | string[] })?.message || 'An error occurred';

        errorResponse = {
          statusCode: status,
          errorCode: this.getErrorCodeFromStatus(status),
          message: Array.isArray(message) ? message.join(', ') : message,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }
    } else {
      // Unknown exception - log it but don't expose details
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      this.logger.error(
        `Unhandled exception: ${exception instanceof Error ? exception.stack : String(exception)}`,
      );

      errorResponse = {
        statusCode: status,
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An internal server error occurred',
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    }

    // Log error for debugging (but not in production for security)
    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} Error: ${errorResponse.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      this.logger.warn(`HTTP ${status} Error: ${errorResponse.message} - Path: ${request.url}`);
    }

    response.status(status).json(errorResponse);
  }

  private getErrorCodeFromStatus(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ErrorCode.INTERNAL_SERVER_ERROR;
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }
}

