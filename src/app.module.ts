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
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { ProjectFinancialsModule } from './project-financials/project-financials.module';
import { ContactsModule } from './contacts/contacts.module';
import { LeadsModule } from './leads/leads.module';
import { ClientsVendorsModule } from './clients-vendors/clients-vendors.module';
import { CalendarsModule } from './calendars/calendars.module';
import { ResourcesModule } from './resources/resources.module';
import { GoalsModule } from './goals/goals.module';
import { KPIsModule } from './kpis/kpis.module';
import { PerformanceModule } from './performance/performance.module';
import { InventoryModule } from './inventory/inventory.module';
import { EquipmentModule } from './equipment/equipment.module';
import { ImportExportModule } from './import-export/import-export.module';
import { ActivitiesModule } from './activities/activities.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { SupportModule } from './support/support.module';
import { FinancialsModule } from './financials/financials.module';
import { NotificationsModule } from './notifications/notifications.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { DocumentsModule } from './documents/documents.module';

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
    ProjectsModule, // Project management module
    TasksModule, // Task management module
    ProjectFinancialsModule, // Project financials module
    ContactsModule, // Contacts management module
    LeadsModule, // Lead management and scoring module
    ClientsVendorsModule, // Clients and vendors management module
    CalendarsModule, // Calendar and scheduling system module
    ResourcesModule, // Resource management module
    GoalsModule, // Goals & OKR framework module
    KPIsModule, // KPI & Metrics framework module
    PerformanceModule, // Performance reviews module
    InventoryModule, // Inventory management system module
    EquipmentModule, // Equipment & Asset tracking module
    ImportExportModule, // Data import framework module
    ActivitiesModule, // Comprehensive audit logging module
    KnowledgeModule, // Knowledge base system module
    SupportModule, // Help center & ticketing module
    FinancialsModule, // Multi-currency support module
    NotificationsModule, // Notification system module
    IntegrationsModule, // Integration framework module
    DocumentsModule, // Document management system module
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
