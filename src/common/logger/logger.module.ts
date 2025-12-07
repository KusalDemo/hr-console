import { Module, Global } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './logger.service';

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => {
        const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
        const logLevel = configService.get<string>('LOG_LEVEL', 'info');

        return {
          pinoHttp: {
            level: logLevel,
            transport: isDevelopment
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: false,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
            serializers: {
              req: (req: { method: string; url: string; headers: Record<string, string> }) => ({
                method: req.method,
                url: req.url,
                headers: {
                  'user-agent': req.headers['user-agent'],
                  'x-forwarded-for': req.headers['x-forwarded-for'],
                },
              }),
              res: (res: { statusCode: number }) => ({
                statusCode: res.statusCode,
              }),
              err: (err: Error) => ({
                type: err.constructor.name,
                message: err.message,
                stack: err.stack,
              }),
            },
            customLogLevel: (req: { statusCode: number }, res: { statusCode: number }) => {
              if (res.statusCode >= 400 && res.statusCode < 500) {
                return 'warn';
              } else if (res.statusCode >= 500) {
                return 'error';
              }
              return 'info';
            },
            customSuccessMessage: (req: { method: string }, res: { statusCode: number }) => {
              return `${req.method} ${res.statusCode}`;
            },
            customErrorMessage: (
              req: { method: string },
              res: { statusCode: number },
              err: Error,
            ) => {
              return `${req.method} ${res.statusCode} - ${err.message}`;
            },
            customAttributeKeys: {
              req: 'request',
              res: 'response',
              err: 'error',
              responseTime: 'responseTime',
            },
            redact: ['request.headers.authorization', 'request.headers.cookie'],
          },
        };
      },
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
