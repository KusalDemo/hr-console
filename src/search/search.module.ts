import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SearchController } from './search.controller';
import { SearchService, SearchIndexService } from './services';
import { EmployeesModule } from '../employees/employees.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { ContactsModule } from '../contacts/contacts.module';
import { DocumentsModule } from '../documents/documents.module';

/**
 * Search Module
 *
 * Provides advanced search capabilities:
 * - Full-text search across entities
 * - Faceted search
 * - Result ranking
 * - Search index management
 * - Search analytics
 */
@Module({
  imports: [
    DatabaseModule,
    EmployeesModule,
    ProjectsModule,
    TasksModule,
    ContactsModule,
    DocumentsModule,
  ],
  controllers: [SearchController],
  providers: [SearchService, SearchIndexService],
  exports: [SearchService, SearchIndexService],
})
export class SearchModule {}
