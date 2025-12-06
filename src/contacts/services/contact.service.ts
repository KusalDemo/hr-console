import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  ContactRepository,
  ContactRelationshipRepository,
  ContactInteractionRepository,
} from '../repositories';
import {
  Contact,
  ContactType,
  ContactCategory,
  ContactStatus,
} from '../entities/contact.entity';
import {
  ContactRelationship,
  RelationshipType,
  RelationshipDirection,
} from '../entities/contact-relationship.entity';
import { ContactInteraction, InteractionType } from '../entities/contact-interaction.entity';
import {
  CreateContactDto,
  UpdateContactDto,
  CreateContactRelationshipDto,
  CreateContactInteractionDto,
  ContactResponseDto,
  ContactRelationshipResponseDto,
  ContactInteractionResponseDto,
} from '../dto';

/**
 * Contact Service
 * 
 * Manages contacts with:
 * - Contact CRUD operations
 * - Duplicate detection and merge
 * - Contact segmentation and tags
 * - Relationship management
 * - Interaction tracking
 * - Full-text search
 */
@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly contactRelationshipRepository: ContactRelationshipRepository,
    private readonly contactInteractionRepository: ContactInteractionRepository,
  ) {}

  /**
   * Create a new contact
   */
  async createContact(
    createDto: CreateContactDto,
    createdBy?: number,
  ): Promise<ContactResponseDto> {
    // Check for potential duplicates
    const duplicates = await this.contactRepository.findPotentialDuplicates(createDto);

    if (duplicates.length > 0) {
      this.logger.warn(
        `Potential duplicates found for contact: ${createDto.fullName} (${duplicates.length} matches)`,
      );
      // Don't throw error, just log warning - allow creation but flag for review
    }

    // Check if contact key exists
    if (createDto.contactKey) {
      const exists = await this.contactRepository.contactKeyExists(createDto.contactKey);

      if (exists) {
        throw new ConflictException(`Contact key '${createDto.contactKey}' already exists`);
      }
    }

    // Check if email already exists
    if (createDto.email) {
      const existing = await this.contactRepository.findByEmail(createDto.email);

      if (existing) {
        throw new ConflictException(`Contact with email '${createDto.email}' already exists`);
      }
    }

    // Generate contact number if not provided
    let contactNumber = createDto.contactNumber;
    if (!contactNumber) {
      contactNumber = await this.generateContactNumber(createDto.contactCategory);
    }

    // Generate contact key if not provided
    let contactKey = createDto.contactKey;
    if (!contactKey) {
      contactKey = await this.generateContactKey(createDto.contactCategory);
    }

    const contact = this.contactRepository.create({
      ...createDto,
      contactKey,
      contactNumber,
      contactStatus: createDto.contactStatus || ContactStatus.ACTIVE,
      nextFollowUpDate: createDto.nextFollowUpDate
        ? new Date(createDto.nextFollowUpDate)
        : null,
      createdBy,
    });

    const saved = await this.contactRepository.save(contact);

    this.logger.log(`Created contact: ${saved.id} (${saved.fullName})`);

    const reloaded = await this.contactRepository.findById(saved.id, true);
    return ContactResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Update a contact
   */
  async updateContact(
    id: number,
    updateDto: UpdateContactDto,
    updatedBy?: number,
  ): Promise<ContactResponseDto> {
    const contact = await this.contactRepository.findById(id);

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    if (contact.isArchived) {
      throw new BadRequestException('Cannot update archived contact');
    }

    // Check for email conflicts if email is being changed
    if (updateDto.email && updateDto.email !== contact.email) {
      const existing = await this.contactRepository.findByEmail(updateDto.email);

      if (existing && existing.id !== id) {
        throw new ConflictException(`Contact with email '${updateDto.email}' already exists`);
      }
    }

    Object.assign(contact, {
      ...updateDto,
      lastContactDate: updateDto.lastContactDate
        ? new Date(updateDto.lastContactDate)
        : contact.lastContactDate,
      nextFollowUpDate: updateDto.nextFollowUpDate
        ? new Date(updateDto.nextFollowUpDate)
        : contact.nextFollowUpDate,
      updatedBy,
    });

    const saved = await this.contactRepository.save(contact);

    this.logger.log(`Updated contact: ${id}`);

    const reloaded = await this.contactRepository.findById(saved.id, true);
    return ContactResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Get contact by ID
   */
  async getContactById(id: number, includeRelations = false): Promise<ContactResponseDto> {
    const contact = await this.contactRepository.findById(id, includeRelations);

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    return ContactResponseDto.fromEntity(contact, includeRelations);
  }

  /**
   * Get contact by key
   */
  async getContactByKey(contactKey: string, includeRelations = false): Promise<ContactResponseDto> {
    const contact = await this.contactRepository.findByKey(contactKey, includeRelations);

    if (!contact) {
      throw new NotFoundException(`Contact with key '${contactKey}' not found`);
    }

    return ContactResponseDto.fromEntity(contact, includeRelations);
  }

  /**
   * Search contacts
   */
  async searchContacts(
    searchTerm: string,
    organizationId?: number,
    includeArchived = false,
  ): Promise<ContactResponseDto[]> {
    const contacts = await this.contactRepository.search(
      searchTerm,
      organizationId,
      includeArchived,
    );

    return contacts.map((contact) => ContactResponseDto.fromEntity(contact));
  }

  /**
   * Get contacts by category
   */
  async getContactsByCategory(
    category: ContactCategory,
    organizationId?: number,
    includeArchived = false,
  ): Promise<ContactResponseDto[]> {
    const contacts = await this.contactRepository.findByCategory(
      category,
      organizationId,
      includeArchived,
    );

    return contacts.map((contact) => ContactResponseDto.fromEntity(contact));
  }

  /**
   * Get contacts by status
   */
  async getContactsByStatus(
    status: ContactStatus,
    organizationId?: number,
    includeArchived = false,
  ): Promise<ContactResponseDto[]> {
    const contacts = await this.contactRepository.findByStatus(
      status,
      organizationId,
      includeArchived,
    );

    return contacts.map((contact) => ContactResponseDto.fromEntity(contact));
  }

  /**
   * Get contacts by tags
   */
  async getContactsByTags(
    tags: string[],
    organizationId?: number,
    includeArchived = false,
  ): Promise<ContactResponseDto[]> {
    const contacts = await this.contactRepository.findByTags(
      tags,
      organizationId,
      includeArchived,
    );

    return contacts.map((contact) => ContactResponseDto.fromEntity(contact));
  }

  /**
   * Get contacts needing follow-up
   */
  async getContactsNeedingFollowUp(
    organizationId?: number,
    daysAhead = 7,
  ): Promise<ContactResponseDto[]> {
    const contacts = await this.contactRepository.findNeedingFollowUp(
      organizationId,
      daysAhead,
    );

    return contacts.map((contact) => ContactResponseDto.fromEntity(contact));
  }

  /**
   * Find potential duplicates for a contact
   */
  async findPotentialDuplicates(
    contactId: number,
  ): Promise<ContactResponseDto[]> {
    const contact = await this.contactRepository.findById(contactId);

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    const duplicates = await this.contactRepository.findPotentialDuplicates(contact, contactId);

    return duplicates.map((dup) => ContactResponseDto.fromEntity(dup));
  }

  /**
   * Merge two contacts
   */
  async mergeContacts(
    primaryContactId: number,
    duplicateContactId: number,
    mergedBy?: number,
  ): Promise<ContactResponseDto> {
    if (primaryContactId === duplicateContactId) {
      throw new BadRequestException('Cannot merge contact with itself');
    }

    const primaryContact = await this.contactRepository.findById(primaryContactId, true);

    if (!primaryContact) {
      throw new NotFoundException(`Primary contact with ID ${primaryContactId} not found`);
    }

    const duplicateContact = await this.contactRepository.findById(duplicateContactId, true);

    if (!duplicateContact) {
      throw new NotFoundException(`Duplicate contact with ID ${duplicateContactId} not found`);
    }

    // Merge data from duplicate into primary (prefer primary, but fill gaps from duplicate)
    if (!primaryContact.email && duplicateContact.email) {
      primaryContact.email = duplicateContact.email;
    }

    if (!primaryContact.emailSecondary && duplicateContact.emailSecondary) {
      primaryContact.emailSecondary = duplicateContact.emailSecondary;
    }

    if (!primaryContact.phone && duplicateContact.phone) {
      primaryContact.phone = duplicateContact.phone;
    }

    if (!primaryContact.phoneMobile && duplicateContact.phoneMobile) {
      primaryContact.phoneMobile = duplicateContact.phoneMobile;
    }

    if (!primaryContact.addressLine1 && duplicateContact.addressLine1) {
      primaryContact.addressLine1 = duplicateContact.addressLine1;
      primaryContact.addressLine2 = duplicateContact.addressLine2;
      primaryContact.city = duplicateContact.city;
      primaryContact.state = duplicateContact.state;
      primaryContact.postalCode = duplicateContact.postalCode;
      primaryContact.country = duplicateContact.country;
    }

    // Merge tags
    const primaryTags = primaryContact.tags ? primaryContact.tags.split(',') : [];
    const duplicateTags = duplicateContact.tags ? duplicateContact.tags.split(',') : [];
    const mergedTags = [...new Set([...primaryTags, ...duplicateTags])];
    primaryContact.tags = mergedTags.join(',');

    // Merge notes
    if (duplicateContact.notes) {
      primaryContact.notes = primaryContact.notes
        ? `${primaryContact.notes}\n\n[Merged from contact ${duplicateContact.id}]\n${duplicateContact.notes}`
        : duplicateContact.notes;
    }

    // Update last contact date if duplicate has more recent contact
    if (
      duplicateContact.lastContactDate &&
      (!primaryContact.lastContactDate ||
        duplicateContact.lastContactDate > primaryContact.lastContactDate)
    ) {
      primaryContact.lastContactDate = duplicateContact.lastContactDate;
    }

    // Move relationships from duplicate to primary
    const duplicateRelationships = await this.contactRelationshipRepository.findByContact(
      duplicateContactId,
    );

    for (const relationship of duplicateRelationships) {
      // Check if relationship already exists
      const existing = await this.contactRelationshipRepository.findByContacts(
        primaryContactId,
        relationship.relatedContactId,
      );

      if (!existing) {
        relationship.contactId = primaryContactId;
        await this.contactRelationshipRepository.save(relationship);
      } else {
        // Remove duplicate relationship
        await this.contactRelationshipRepository.remove(relationship);
      }
    }

    // Move interactions from duplicate to primary
    const duplicateInteractions = await this.contactInteractionRepository.findByContact(
      duplicateContactId,
    );

    for (const interaction of duplicateInteractions) {
      interaction.contactId = primaryContactId;
      await this.contactInteractionRepository.save(interaction);
    }

    // Save primary contact
    await this.contactRepository.save(primaryContact);

    // Archive duplicate contact
    duplicateContact.isArchived = true;
    duplicateContact.archivedAt = new Date();
    duplicateContact.archivedBy = mergedBy;
    duplicateContact.contactStatus = ContactStatus.ARCHIVED;

    // Add merge metadata
    duplicateContact.contactMetadata = {
      ...duplicateContact.contactMetadata,
      mergedInto: primaryContactId,
      mergedAt: new Date(),
      mergedBy,
    };

    await this.contactRepository.save(duplicateContact);

    this.logger.log(
      `Merged contact ${duplicateContactId} into ${primaryContactId}`,
    );

    const reloaded = await this.contactRepository.findById(primaryContactId, true);
    return ContactResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Archive a contact
   */
  async archiveContact(id: number, archivedBy?: number): Promise<ContactResponseDto> {
    const contact = await this.contactRepository.findById(id);

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    if (contact.isArchived) {
      throw new BadRequestException('Contact is already archived');
    }

    contact.isArchived = true;
    contact.archivedAt = new Date();
    contact.archivedBy = archivedBy;
    contact.contactStatus = ContactStatus.ARCHIVED;

    const saved = await this.contactRepository.save(contact);

    this.logger.log(`Archived contact: ${id}`);

    const reloaded = await this.contactRepository.findById(saved.id, true);
    return ContactResponseDto.fromEntity(reloaded, true);
  }

  /**
   * Add relationship to contact
   */
  async addRelationship(
    contactId: number,
    createDto: CreateContactRelationshipDto,
    createdBy?: number,
  ): Promise<ContactRelationshipResponseDto> {
    const contact = await this.contactRepository.findById(contactId);

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    const relatedContact = await this.contactRepository.findById(createDto.relatedContactId);

    if (!relatedContact) {
      throw new NotFoundException(
        `Related contact with ID ${createDto.relatedContactId} not found`,
      );
    }

    if (contactId === createDto.relatedContactId) {
      throw new BadRequestException('Contact cannot have relationship with itself');
    }

    // Check if relationship already exists
    const existing = await this.contactRelationshipRepository.findByContacts(
      contactId,
      createDto.relatedContactId,
    );

    if (existing) {
      throw new ConflictException('Relationship already exists');
    }

    const relationship = this.contactRelationshipRepository.create({
      contactId,
      relatedContactId: createDto.relatedContactId,
      relationshipType: createDto.relationshipType,
      relationshipDirection:
        createDto.relationshipDirection || RelationshipDirection.BIDIRECTIONAL,
      relationshipStrength: createDto.relationshipStrength,
      description: createDto.description,
      startDate: createDto.startDate ? new Date(createDto.startDate) : null,
      endDate: createDto.endDate ? new Date(createDto.endDate) : null,
      createdBy,
    });

    const saved = await this.contactRelationshipRepository.save(relationship);

    // Create reverse relationship if bidirectional
    if (saved.relationshipDirection === RelationshipDirection.BIDIRECTIONAL) {
      const reverse = this.contactRelationshipRepository.create({
        contactId: createDto.relatedContactId,
        relatedContactId: contactId,
        relationshipType: createDto.relationshipType,
        relationshipDirection: RelationshipDirection.BIDIRECTIONAL,
        relationshipStrength: createDto.relationshipStrength,
        description: createDto.description,
        startDate: createDto.startDate ? new Date(createDto.startDate) : null,
        endDate: createDto.endDate ? new Date(createDto.endDate) : null,
        createdBy,
      });

      await this.contactRelationshipRepository.save(reverse);
    }

    this.logger.log(
      `Added relationship: contact ${contactId} -> ${createDto.relatedContactId}`,
    );

    const reloaded = await this.contactRelationshipRepository
      .createQueryBuilder('relationship')
      .leftJoinAndSelect('relationship.relatedContact', 'relatedContact')
      .where('relationship.id = :id', { id: saved.id })
      .getOne();

    return ContactRelationshipResponseDto.fromEntity(reloaded!, true);
  }

  /**
   * Add interaction to contact
   */
  async addInteraction(
    contactId: number,
    createDto: CreateContactInteractionDto,
    createdBy?: number,
  ): Promise<ContactInteractionResponseDto> {
    const contact = await this.contactRepository.findById(contactId);

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    const interaction = this.contactInteractionRepository.create({
      contactId,
      ...createDto,
      interactionDate: new Date(createDto.interactionDate),
      nextFollowUpDate: createDto.nextFollowUpDate
        ? new Date(createDto.nextFollowUpDate)
        : null,
      createdBy,
    });

    const saved = await this.contactInteractionRepository.save(interaction);

    // Update contact's last contact date and last activity date
    contact.lastContactDate = new Date();
    contact.lastActivityDate = new Date();

    if (createDto.nextFollowUpDate) {
      contact.nextFollowUpDate = new Date(createDto.nextFollowUpDate);
    }

    await this.contactRepository.save(contact);

    this.logger.log(`Added interaction: ${saved.id} for contact ${contactId}`);

    return ContactInteractionResponseDto.fromEntity(saved);
  }

  /**
   * Get contact interactions
   */
  async getContactInteractions(
    contactId: number,
    limit?: number,
  ): Promise<ContactInteractionResponseDto[]> {
    const interactions = limit
      ? await this.contactInteractionRepository.findRecent(contactId, limit)
      : await this.contactInteractionRepository.findByContact(contactId);

    return interactions.map((interaction) =>
      ContactInteractionResponseDto.fromEntity(interaction),
    );
  }

  /**
   * Generate contact number
   */
  private async generateContactNumber(category: ContactCategory): Promise<string> {
    const prefix = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now();
    return `${prefix}-${timestamp}`;
  }

  /**
   * Generate contact key
   */
  private async generateContactKey(category: ContactCategory): Promise<string> {
    const prefix = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now();
    const key = `${prefix}-${timestamp}`;

    // Ensure uniqueness
    const exists = await this.contactRepository.contactKeyExists(key);
    if (exists) {
      return `${key}-${Math.random().toString(36).substring(2, 9)}`;
    }

    return key;
  }
}

