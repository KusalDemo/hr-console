import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsController } from './contacts.controller';
import { ContactService } from './services';
import {
  ContactRepository,
  ContactRelationshipRepository,
  ContactInteractionRepository,
} from './repositories';
import {
  Contact,
  ContactRelationship,
  ContactInteraction,
} from './entities';

/**
 * Contacts Module
 * 
 * Provides unified contact management for clients, customers, vendors, leads:
 * - Contact CRUD operations
 * - Contact relationships (hierarchical and other)
 * - Interaction tracking
 * - Duplicate detection and merge
 * - Contact segmentation and tags
 * - Full-text search
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contact,
      ContactRelationship,
      ContactInteraction,
    ]),
  ],
  controllers: [ContactsController],
  providers: [
    ContactService,
    ContactRepository,
    ContactRelationshipRepository,
    ContactInteractionRepository,
  ],
  exports: [
    ContactService,
    ContactRepository,
    ContactRelationshipRepository,
    ContactInteractionRepository,
  ],
})
export class ContactsModule {}

