import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

/**
 * Swagger/OpenAPI Configuration
 * 
 * Configures Swagger UI for interactive API documentation
 * Access at: http://localhost:3000/api/docs
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('HR Console API')
    .setDescription(
      'Comprehensive HR Management System API with multi-tenancy support. ' +
      'This API provides endpoints for managing employees, organizations, projects, ' +
      'time tracking, workflows, and more.',
    )
    .setVersion('1.0')
    .setContact('HR Console Support', 'https://support.your-hr-saas.com', 'support@your-hr-saas.com')
    .setLicense('Proprietary', 'https://your-hr-saas.com/license')
    .addServer('http://localhost:3000/api', 'Development Server')
    .addServer('https://api.your-hr-saas.com/api', 'Production Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-Tenant',
        in: 'header',
        description: 'Tenant key for multi-tenant operations',
      },
      'X-Tenant',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-Organization',
        in: 'header',
        description: 'Organization ID for organization-scoped operations',
      },
      'X-Organization',
    )
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Tenants', 'Tenant management (Super Admin only)')
    .addTag('Organizations', 'Organization management')
    .addTag('Employees', 'Employee management')
    .addTag('Custom Fields', 'Custom field definitions and values')
    .addTag('Workflows', 'Workflow engine and state management')
    .addTag('Rules', 'Business rules engine')
    .addTag('Projects', 'Project management')
    .addTag('Tasks', 'Task management')
    .addTag('Time Tracking', 'Time entry and tracking')
    .addTag('Timesheets', 'Timesheet management and approval')
    .addTag('Leave', 'Leave management and policies')
    .addTag('Calendar', 'Calendar and event management')
    .addTag('Notifications', 'Notification system')
    .addTag('Webhooks', 'Webhook subscriptions and events')
    .addTag('GraphQL', 'GraphQL API endpoint')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'HR Console API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
    `,
  });
}
