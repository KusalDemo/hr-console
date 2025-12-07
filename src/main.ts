import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';
import { Logger } from 'nestjs-pino';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  const configService = app.get(AppConfigService);

  // Global API prefix
  app.setGlobalPrefix(configService.apiPrefix);

  // CORS configuration
  app.enableCors({
    origin: configService.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant', 'X-Organization'],
  });

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Setup Swagger/OpenAPI documentation (only in non-production)
  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
    logger.log(
      `Swagger documentation available at: http://localhost:${configService.port}/${configService.apiPrefix}/docs`,
    );
  }

  const port = configService.port;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/${configService.apiPrefix}`);
}
bootstrap();
