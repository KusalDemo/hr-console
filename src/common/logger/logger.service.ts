import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(private readonly pinoLogger: PinoLogger) {}

  log(message: string, context?: string): void {
    this.pinoLogger.info({ context }, message);
  }

  error(message: string, trace?: string, context?: string): void {
    this.pinoLogger.error({ context, trace }, message);
  }

  warn(message: string, context?: string): void {
    this.pinoLogger.warn({ context }, message);
  }

  debug(message: string, context?: string): void {
    this.pinoLogger.debug({ context }, message);
  }

  verbose(message: string, context?: string): void {
    this.pinoLogger.trace({ context }, message);
  }

  /**
   * Log with additional metadata
   */
  logWithMetadata(
    level: 'log' | 'error' | 'warn' | 'debug' | 'verbose',
    message: string,
    metadata: Record<string, unknown>,
    context?: string,
  ): void {
    const logMethod = (this[level] as any).bind(this);
    const logMessage: any = metadata ? { ...metadata, message } : message;
    logMethod(logMessage, context);
  }
}

