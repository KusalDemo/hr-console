import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: NestConfigService) {}

  // Application
  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get apiPrefix(): string {
    return this.configService.get<string>('API_PREFIX', 'api');
  }

  // Database
  get dbHost(): string {
    return this.configService.get<string>('DB_HOST', 'localhost');
  }

  get dbPort(): number {
    return this.configService.get<number>('DB_PORT', 5432);
  }

  get dbUsername(): string {
    return this.configService.get<string>('DB_USERNAME', 'postgres');
  }

  get dbPassword(): string {
    return this.configService.get<string>('DB_PASSWORD', 'postgres');
  }

  get dbName(): string {
    return this.configService.get<string>('DB_NAME', 'hr_console_db');
  }

  get dbAdminSchema(): string {
    return this.configService.get<string>('DB_ADMIN_SCHEMA', 'admin');
  }

  // JWT
  get jwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is required but not set');
    }
    return secret;
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN', '15m');
  }

  get jwtRefreshSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is required but not set');
    }
    return secret;
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  // Password Hashing
  get bcryptRounds(): number {
    const rounds = this.configService.get<string | number>('BCRYPT_ROUNDS', 12);
    const parsed = typeof rounds === 'string' ? parseInt(rounds, 10) : rounds;
    // Ensure valid number between 4 and 31 (bcrypt valid range)
    if (isNaN(parsed) || parsed < 4 || parsed > 31) {
      return 12; // Default to 12 if invalid
    }
    return parsed;
  }

  // CORS
  get corsOrigin(): string {
    return this.configService.get<string>('CORS_ORIGIN', 'http://localhost:3001');
  }

  // Logging
  get logLevel(): string {
    return this.configService.get<string>('LOG_LEVEL', 'debug');
  }

  // Email/SMTP Configuration
  get smtpHost(): string {
    return this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
  }

  get smtpPort(): number {
    return this.configService.get<number>('SMTP_PORT', 587);
  }

  get smtpSecure(): boolean {
    return this.configService.get<string>('SMTP_SECURE', 'false') === 'true';
  }

  get smtpUser(): string {
    return this.configService.get<string>('SMTP_USER', '');
  }

  get smtpPassword(): string {
    return this.configService.get<string>('SMTP_PASSWORD', '');
  }

  get emailFrom(): string {
    return this.configService.get<string>('EMAIL_FROM', this.smtpUser);
  }

  get emailFromName(): string {
    return this.configService.get<string>('EMAIL_FROM_NAME', 'HR Console');
  }

  get frontendUrl(): string {
    return this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
  }

  // Validation helpers
  isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  isTest(): boolean {
    return this.nodeEnv === 'test';
  }
}
