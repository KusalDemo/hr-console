import { Lead, LeadStatus, LeadSource, LeadPriority } from '../entities/lead.entity';
import { ContactResponseDto } from '../../contacts/dto/contact-response.dto';

/**
 * Lead Response DTO
 */
export class LeadResponseDto {
  id: number;
  leadNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  displayName: string | null;
  companyName: string | null;
  jobTitle: string | null;
  email: string | null;
  emailSecondary: string | null;
  phone: string | null;
  phoneMobile: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  leadStatus: LeadStatus;
  leadSource: LeadSource;
  leadPriority: LeadPriority;
  leadScore: number;
  lastScoreCalculation: Date | null;
  assignedTo: number | null;
  organizationId: number | null;
  campaignId: number | null;
  campaignName: string | null;
  industry: string | null;
  companySize: string | null;
  estimatedValue: number | null;
  currencyCode: string | null;
  expectedCloseDate: Date | null;
  actualCloseDate: Date | null;
  conversionDate: Date | null;
  convertedContactId: number | null;
  conversionReason: string | null;
  lossReason: string | null;
  rejectionReason: string | null;
  tags: string | null;
  notes: string | null;
  lastContactDate: Date | null;
  nextFollowUpDate: Date | null;
  leadMetadata: Record<string, any> | null;
  isConverted: boolean;
  isActive: boolean;
  isArchived: boolean;
  archivedAt: Date | null;
  archivedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  // Relations
  convertedContact?: ContactResponseDto | null;

  // Computed fields
  displayNameComputed?: string;
  isCurrentlyActive?: boolean;
  canBeConverted?: boolean;

  static fromEntity(lead: Lead, includeConvertedContact = false): LeadResponseDto {
    const dto = new LeadResponseDto();
    dto.id = lead.id;
    dto.leadNumber = lead.leadNumber;
    dto.firstName = lead.firstName;
    dto.lastName = lead.lastName;
    dto.fullName = lead.fullName;
    dto.displayName = lead.displayName;
    dto.companyName = lead.companyName;
    dto.jobTitle = lead.jobTitle;
    dto.email = lead.email;
    dto.emailSecondary = lead.emailSecondary;
    dto.phone = lead.phone;
    dto.phoneMobile = lead.phoneMobile;
    dto.website = lead.website;
    dto.addressLine1 = lead.addressLine1;
    dto.addressLine2 = lead.addressLine2;
    dto.city = lead.city;
    dto.state = lead.state;
    dto.postalCode = lead.postalCode;
    dto.country = lead.country;
    dto.leadStatus = lead.leadStatus;
    dto.leadSource = lead.leadSource;
    dto.leadPriority = lead.leadPriority;
    dto.leadScore = lead.leadScore;
    dto.lastScoreCalculation = lead.lastScoreCalculation;
    dto.assignedTo = lead.assignedTo;
    dto.organizationId = lead.organizationId;
    dto.campaignId = lead.campaignId;
    dto.campaignName = lead.campaignName;
    dto.industry = lead.industry;
    dto.companySize = lead.companySize;
    dto.estimatedValue = lead.estimatedValue;
    dto.currencyCode = lead.currencyCode;
    dto.expectedCloseDate = lead.expectedCloseDate;
    dto.actualCloseDate = lead.actualCloseDate;
    dto.conversionDate = lead.conversionDate;
    dto.convertedContactId = lead.convertedContactId;
    dto.conversionReason = lead.conversionReason;
    dto.lossReason = lead.lossReason;
    dto.rejectionReason = lead.rejectionReason;
    dto.tags = lead.tags;
    dto.notes = lead.notes;
    dto.lastContactDate = lead.lastContactDate;
    dto.nextFollowUpDate = lead.nextFollowUpDate;
    dto.leadMetadata = lead.leadMetadata;
    dto.isConverted = lead.isConverted;
    dto.isActive = lead.isActive;
    dto.isArchived = lead.isArchived;
    dto.archivedAt = lead.archivedAt;
    dto.archivedBy = lead.archivedBy;
    dto.createdAt = lead.createdAt;
    dto.updatedAt = lead.updatedAt;
    dto.createdBy = lead.createdBy;
    dto.updatedBy = lead.updatedBy;

    // Computed fields
    dto.displayNameComputed = lead.getDisplayName();
    dto.isCurrentlyActive = lead.isCurrentlyActive();
    dto.canBeConverted = lead.canBeConverted();

    if (includeConvertedContact && lead.convertedContact) {
      dto.convertedContact = ContactResponseDto.fromEntity(lead.convertedContact);
    }

    return dto;
  }
}


