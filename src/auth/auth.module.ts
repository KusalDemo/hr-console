import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { DatabaseModule } from '../database/database.module';
import { AppConfigService } from '../config/config.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { AuthService } from './services/auth.service';
import { PasswordService } from './services/password.service';
import { PasswordChangeService } from './services/password-change.service';
import { TokenService } from './services/token.service';
import { SuperAdminAuthService } from './services/super-admin-auth.service';
import { TenantAdminAuthService } from './services/tenant-admin-auth.service';
import { UserAuthService } from './services/user-auth.service';
import { RateLimitService } from './services/rate-limit.service';
import { SuperAdminRepository } from '../admin/repositories/super-admin.repository';
import { TenantAdminRepository } from '../admin/repositories/tenant-admin.repository';
import { SuperAdmin } from '../admin/entities/super-admin.entity';
import { TenantAdmin } from '../admin/entities/tenant-admin.entity';
import { Tenant } from '../admin/entities/tenant.entity';
import { MultiTenantService } from '../database/multi-tenant.service';
import { RbacService } from './services/rbac.service';
import { UserRepository } from '../users/repositories/user.repository';
import { RoleRepository } from '../roles/repositories/role.repository';
import { PermissionRepository } from '../roles/repositories/permission.repository';
import { User } from '../users/entities/user.entity';
import { Role, Permission, RolePermission } from '../roles/entities';

/**
 * Authentication Module
 * Wires up all authentication components:
 * - Passport JWT strategy
 * - Authentication services (super admin, tenant admin, user)
 * - Guards (JWT, Roles)
 * - Rate limiting middleware
 * - Controllers
 */
@Module({
  imports: [
    // Import ConfigModule for configuration
    ConfigModule,
    // Import DatabaseModule for TypeORM
    DatabaseModule,
    // Import PassportModule for authentication strategies
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Import JwtModule for token generation
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        secret: configService.jwtSecret,
      }),
    }),
    // Register entities for repositories
    TypeOrmModule.forFeature([
      SuperAdmin,
      TenantAdmin,
      Tenant,
      User, // For RBAC service
      Role, // For RBAC service
      Permission, // For RBAC service
      RolePermission, // For RBAC service
    ]),
  ],
  controllers: [AuthController],
  providers: [
    // Strategies
    JwtStrategy,
    // Guards
    JwtAuthGuard,
    RolesGuard,
    // Services
    AuthService,
    PasswordService,
    PasswordChangeService,
    TokenService,
    SuperAdminAuthService,
    TenantAdminAuthService,
    UserAuthService,
    RateLimitService,
    RbacService, // RBAC service for permission checking and role management
    // Repositories
    SuperAdminRepository,
    TenantAdminRepository,
    UserRepository, // For RBAC service
    RoleRepository, // For RBAC service
    PermissionRepository, // For RBAC service
    // Database services
    MultiTenantService,
  ],
  exports: [
    // Export guards for use in other modules
    JwtAuthGuard,
    RolesGuard,
    // Export services for use in other modules
    AuthService,
    PasswordService,
    TokenService,
    RbacService, // Export RBAC service for use in other modules
    // Export PassportModule for use in other modules
    PassportModule,
    // Export JwtModule for use in other modules
    JwtModule,
  ],
})
export class AuthModule implements NestModule {
  /**
   * Configure middleware
   * Apply rate limiting middleware to authentication endpoints
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimitMiddleware).forRoutes('auth/login', 'auth/refresh');
  }
}

