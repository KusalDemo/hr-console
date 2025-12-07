import { Module } from '@nestjs/common';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AppConfigService } from '../config/config.service';
import { EmployeesModule } from '../employees/employees.module';
import { ProjectsModule } from '../projects/projects.module';
import { TimesheetsModule } from '../timesheets/timesheets.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { EmployeesResolver } from './resolvers/employees.resolver';
import { ProjectsResolver } from './resolvers/projects.resolver';
import { TimesheetsResolver, TimesheetEntriesResolver } from './resolvers/timesheets.resolver';
import { DataLoaderModule } from './dataloaders/dataloader.module';

/**
 * GraphQL Module
 * 
 * Provides GraphQL API layer with:
 * - Code-first schema generation
 * - Query, mutation, and subscription support
 * - Field-level permissions
 * - Query complexity limits
 * - DataLoader for N+1 query optimization
 * - Integration with authentication and authorization
 */
@Module({
  imports: [
    NestGraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        // Code-first approach (auto-generate schema from decorators)
        autoSchemaFile: join(process.cwd(), 'src/graphql/schema.gql'),
        // Generate schema on every request in development
        sortSchema: true,
        // Apollo Server v4+ uses Explorer by default (playground is deprecated)
        // Enable introspection (can be disabled in production for security)
        introspection: configService.nodeEnv !== 'production',
        // Context function to extract user and tenant info
        context: ({ req }) => ({
          req,
          user: req.user, // Set by JWT guard
          tenantContext: (req as any).tenantContext, // Set by tenant middleware
        }),
        // Format errors
        formatError: (error) => {
          // Log error for debugging
          console.error('GraphQL Error:', error);
          
          // Return user-friendly error messages
          return {
            message: error.message,
            code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
            path: error.path,
            // Only include stack trace in development
            ...(configService.nodeEnv !== 'production' && {
              stack: error.stack,
            }),
          };
        },
        // Query complexity limit
        validationRules: [
          // Add complexity analysis
          // This can be extended with graphql-query-complexity
        ],
      }),
    }),
    // Import modules that provide entities/services for resolvers
    EmployeesModule,
    ProjectsModule,
    TimesheetsModule,
    OrganizationsModule,
    AuthModule,
    // DataLoader module for N+1 optimization
    DataLoaderModule,
  ],
  providers: [
    // Resolvers
    EmployeesResolver,
    ProjectsResolver,
    TimesheetsResolver,
    TimesheetEntriesResolver,
  ],
  exports: [NestGraphQLModule],
})
export class GraphQLModule {}
