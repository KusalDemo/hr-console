import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './common/logger/logger.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { RulesModule } from './rules/rules.module';
import { TimesheetsModule } from './timesheets/timesheets.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    OrganizationsModule, // Import after TenantsModule so middleware order is correct
    SubscriptionsModule, // Import after TenantsModule for tenant context
    CustomFieldsModule, // Custom fields framework
    WorkflowsModule, // Workflow engine
    RulesModule, // Rule engine
    TimesheetsModule, // Timesheets module
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
