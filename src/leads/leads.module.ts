import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsController } from './leads.controller';
import { LeadService, LeadScoringService } from './services';
import {
  LeadRepository,
  LeadScoringRuleRepository,
} from './repositories';
import {
  Lead,
  LeadScoringRule,
} from './entities';
import { ContactsModule } from '../contacts/contacts.module';

/**
 * Leads Module
 * 
 * Provides lead pipeline and conversion tracking:
 * - Lead CRUD operations
 * - Lead scoring and routing
 * - Lead conversion to contacts
 * - Campaign attribution
 * - Automated scoring rules
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      LeadScoringRule,
    ]),
    ContactsModule,
  ],
  controllers: [LeadsController],
  providers: [
    LeadService,
    LeadScoringService,
    LeadRepository,
    LeadScoringRuleRepository,
  ],
  exports: [
    LeadService,
    LeadScoringService,
    LeadRepository,
    LeadScoringRuleRepository,
  ],
})
export class LeadsModule {}

