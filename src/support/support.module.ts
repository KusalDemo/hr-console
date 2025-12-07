import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SupportController } from './support.controller';
import { SupportService, SLATrackingService } from './services';
import {
  SupportTicketRepository,
  TicketCategoryRepository,
  TicketSLARepository,
} from './repositories';
import {
  SupportTicket,
  TicketCategory,
  TicketSLA,
  TicketComment,
  TicketAttachment,
  TicketTimeEntry,
} from './entities';
import { OrganizationsModule } from '../organizations/organizations.module';
import { EmployeesModule } from '../employees/employees.module';

/**
 * Support Module
 *
 * Provides support ticket management:
 * - Ticket lifecycle (open, assigned, in-progress, resolved, closed)
 * - SLA tracking and alerts
 * - Ticket assignment and routing
 * - Time tracking
 * - Comments and attachments
 * - Category and SLA management
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupportTicket,
      TicketCategory,
      TicketSLA,
      TicketComment,
      TicketAttachment,
      TicketTimeEntry,
    ]),
    ScheduleModule.forRoot(), // For scheduled SLA checks
    OrganizationsModule,
    EmployeesModule,
  ],
  controllers: [SupportController],
  providers: [
    SupportService,
    SLATrackingService,
    SupportTicketRepository,
    TicketCategoryRepository,
    TicketSLARepository,
  ],
  exports: [
    SupportService,
    SLATrackingService,
    SupportTicketRepository,
    TicketCategoryRepository,
    TicketSLARepository,
  ],
})
export class SupportModule {}
