import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { TenantsModule } from '../tenants/tenants.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './services/organizations.service';
import { OrganizationContextService } from './services/organization-context.service';
import { OrganizationMembershipService } from './services/organization-membership.service';
import { OrganizationSettingsService } from './services/organization-settings.service';
import { TenantAdminOrgService } from './services/tenant-admin-org.service';
import { OrganizationHierarchyService } from './services/organization-hierarchy.service';
import { OrganizationStatsService } from './services/organization-stats.service';
import { OrganizationSelectionMiddleware } from './middleware/organization-selection.middleware';
import { OrganizationAccessGuard } from './guards/organization-access.guard';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationMembershipRepository } from './repositories/organization-membership.repository';
import { OrganizationSettingsRepository } from './repositories/organization-settings.repository';
import { Organization } from './entities/organization.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { OrganizationSettings } from './entities/organization-settings.entity';
import { UserRepository } from '../users/repositories/user.repository';
import { User } from '../users/entities/user.entity';

/**
 * Organizations Module
 * 
 * Wires up all organization management components:
 * - Organization management controller
 * - Organization services (CRUD, context, membership, settings)
 * - Organization guards (access validation)
 * - Organization selection middleware
 * - Organization repositories
 * 
 * This module provides:
 * - Organization creation and management within tenants
 * - Organization context management for multi-organization support
 * - Organization membership management
 * - Organization settings management
 * - Organization access validation
 */
@Module({
  imports: [
    // Import ConfigModule for configuration
    ConfigModule,
    // Import DatabaseModule for TypeORM DataSource
    DatabaseModule,
    // Import AuthModule for TokenService (used in middleware)
    AuthModule,
    // Import TenantsModule for TenantContextService
    TenantsModule,
    // Register Organization entities for repositories
    TypeOrmModule.forFeature([
      Organization,
      OrganizationMembership,
      OrganizationSettings,
      User, // Needed for UserRepository
    ]),
  ],
  controllers: [OrganizationsController],
  providers: [
    // Services
    OrganizationsService,
    OrganizationContextService,
    OrganizationMembershipService,
    OrganizationSettingsService,
    TenantAdminOrgService,
    OrganizationHierarchyService,
    OrganizationStatsService,
    // Guards
    OrganizationAccessGuard,
    // Repositories
    OrganizationRepository,
    OrganizationMembershipRepository,
    OrganizationSettingsRepository,
    UserRepository, // Needed for OrganizationContextService
  ],
  exports: [
    // Export services for use in other modules
    OrganizationsService,
    OrganizationContextService,
    OrganizationMembershipService,
    OrganizationSettingsService,
    TenantAdminOrgService,
    OrganizationHierarchyService,
    OrganizationStatsService,
    // Export guards for use in other modules
    OrganizationAccessGuard,
    // Export repositories for use in other modules
    OrganizationRepository,
    OrganizationMembershipRepository,
    OrganizationSettingsRepository,
  ],
})
export class OrganizationsModule implements NestModule {
  /**
   * Configure middleware
   * Apply organization selection middleware to all routes (except public routes)
   * This middleware extracts organization from headers/query and sets organization context
   * 
   * Note: This middleware should run AFTER TenantContextMiddleware
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(OrganizationSelectionMiddleware)
      .exclude(
        // Exclude public routes (handled by middleware itself, but listed here for clarity)
        'auth/(.*)',
        'health/(.*)',
        'admin/(.*)', // Admin routes don't need organization context
      )
      .forRoutes('*'); // Apply to all routes
  }
}

