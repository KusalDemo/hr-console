import {
  Contact,
  ContactType,
  ContactCategory,
  ContactStatus,
  CompanySize,
} from '../entities/contact.entity';
import { ContactRelationshipResponseDto } from './contact-relationship-response.dto';
import { ContactInteractionResponseDto } from './contact-interaction-response.dto';

/**
 * Contact Response DTO
 */
export class ContactResponseDto {
  id: number;
  contactKey: string | null;
  contactNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  displayName: string | null;
  companyName: string | null;
  contactType: ContactType;
  contactCategory: ContactCategory;
  contactStatus: ContactStatus;
  contactSource: string | null;
  email: string | null;
  emailSecondary: string | null;
  phone: string | null;
  phoneMobile: string | null;
  phoneWork: string | null;
  phoneFax: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  addressType: string | null;
  organizationId: number | null;
  companySize: CompanySize | null;
  industry: string | null;
  tags: string | null;
  notes: string | null;
  lastContactDate: Date | null;
  lastActivityDate: Date | null;
  nextFollowUpDate: Date | null;
  contactMetadata: Record<string, any> | null;
  isActive: boolean;
  isArchived: boolean;
  archivedAt: Date | null;
  archivedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  // Relations
  relationships?: ContactRelationshipResponseDto[];
  interactions?: ContactInteractionResponseDto[];

  // Computed fields
  displayNameComputed?: string;
  isCurrentlyActive?: boolean;

  static fromEntity(contact: Contact, includeRelations = false): ContactResponseDto {
    const dto = new ContactResponseDto();
    dto.id = contact.id;
    dto.contactKey = contact.contactKey;
    dto.contactNumber = contact.contactNumber;
    dto.firstName = contact.firstName;
    dto.lastName = contact.lastName;
    dto.fullName = contact.fullName;
    dto.displayName = contact.displayName;
    dto.companyName = contact.companyName;
    dto.contactType = contact.contactType;
    dto.contactCategory = contact.contactCategory;
    dto.contactStatus = contact.contactStatus;
    dto.contactSource = contact.contactSource;
    dto.email = contact.email;
    dto.emailSecondary = contact.emailSecondary;
    dto.phone = contact.phone;
    dto.phoneMobile = contact.phoneMobile;
    dto.phoneWork = contact.phoneWork;
    dto.phoneFax = contact.phoneFax;
    dto.website = contact.website;
    dto.addressLine1 = contact.addressLine1;
    dto.addressLine2 = contact.addressLine2;
    dto.city = contact.city;
    dto.state = contact.state;
    dto.postalCode = contact.postalCode;
    dto.country = contact.country;
    dto.addressType = contact.addressType;
    dto.organizationId = contact.organizationId;
    dto.companySize = contact.companySize;
    dto.industry = contact.industry;
    dto.tags = contact.tags;
    dto.notes = contact.notes;
    dto.lastContactDate = contact.lastContactDate;
    dto.lastActivityDate = contact.lastActivityDate;
    dto.nextFollowUpDate = contact.nextFollowUpDate;
    dto.contactMetadata = contact.contactMetadata;
    dto.isActive = contact.isActive;
    dto.isArchived = contact.isArchived;
    dto.archivedAt = contact.archivedAt;
    dto.archivedBy = contact.archivedBy;
    dto.createdAt = contact.createdAt;
    dto.updatedAt = contact.updatedAt;
    dto.createdBy = contact.createdBy;
    dto.updatedBy = contact.updatedBy;

    // Computed fields
    dto.displayNameComputed = contact.getDisplayName();
    dto.isCurrentlyActive = contact.isCurrentlyActive();

    if (includeRelations) {
      if (contact.relationships && Array.isArray(contact.relationships)) {
        dto.relationships = contact.relationships.map((rel) =>
          ContactRelationshipResponseDto.fromEntity(rel, true),
        );
      }

      if (contact.interactions && Array.isArray(contact.interactions)) {
        dto.interactions = contact.interactions.map((interaction) =>
          ContactInteractionResponseDto.fromEntity(interaction),
        );
      }
    }

    return dto;
  }
}

