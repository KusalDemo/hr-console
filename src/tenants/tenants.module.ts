import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './services/tenants.service';
import { TenantProvisioningService } from './services/tenant-provisioning.service';
import { TenantInitializationService } from './services/tenant-initialization.service';
import { TenantContextService } from './services/tenant-context.service';
import { TenantContextMiddleware } from './middleware/tenant-context.middleware';
import { TenantExistsGuard } from './guards/tenant-exists.guard';
import { TenantRepository } from '../admin/repositories/tenant.repository';
import { TenantAdminRepository } from '../admin/repositories/tenant-admin.repository';
import { Tenant } from '../admin/entities/tenant.entity';
import { TenantAdmin } from '../admin/entities/tenant-admin.entity';
import { MultiTenantService } from '../database/multi-tenant.service';
import { TenantDeactivationService } from './services/tenant-deactivation.service';
import { TenantReactivationService } from './services/tenant-reactivation.service';
import { FixTenantAdminService } from './services/fix-tenant-admin.service';
import { EmailModule } from '../email/email.module';

/**
 * Tenants Module
 * 
 * Wires up all tenant management components:
 * - Tenant management controller
 * - Tenant services (provisioning, initialization, context, business logic)
 * - Tenant guards (existence validation)
 * - Tenant context middleware
 * - Tenant repositories
 * 
 * This module provides:
 * - Tenant creation and management (super admin only)
 * - Tenant context management for multi-tenancy
 * - Tenant validation and status management
 */
@Module({
  imports: [
    // Import ConfigModule for configuration
    ConfigModule,
    // Import DatabaseModule for TypeORM DataSource
    DatabaseModule,
    // Import AuthModule for PasswordService and TokenService
    AuthModule,
    // Import EmailModule for sending welcome emails
    EmailModule,
    // Register Tenant and TenantAdmin entities for repositories
    TypeOrmModule.forFeature([Tenant, TenantAdmin]),
  ],
  controllers: [TenantsController],
  providers: [
    // Services
    TenantsService,
    TenantProvisioningService,
    TenantInitializationService,
    TenantContextService,
    TenantDeactivationService,
    TenantReactivationService,
    FixTenantAdminService,
    // Guards
    TenantExistsGuard,
    // Repositories
    TenantRepository,
    TenantAdminRepository,
    // Database services
    MultiTenantService,
  ],
  exports: [
    // Export services for use in other modules
    TenantsService,
    TenantContextService,
    TenantDeactivationService,
    TenantReactivationService,
    // Export guards for use in other modules
    TenantExistsGuard,
    // Export repositories for use in other modules
    TenantRepository,
  ],
})
export class TenantsModule implements NestModule {
  /**
   * Configure middleware
   * Apply tenant context middleware to all routes (except public routes)
   * This middleware extracts tenant from JWT and sets tenant context
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .exclude(
        // Exclude public routes (handled by middleware itself, but listed here for clarity)
        'auth/(.*)',
        'health/(.*)',
      )
      .forRoutes('*'); // Apply to all routes
  }
}

