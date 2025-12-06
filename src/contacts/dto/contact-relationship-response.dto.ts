import {
  ContactRelationship,
  RelationshipType,
  RelationshipDirection,
  RelationshipStrength,
} from '../entities/contact-relationship.entity';

/**
 * Contact Relationship Response DTO
 */
export class ContactRelationshipResponseDto {
  id: number;
  contactId: number;
  relatedContactId: number;
  relationshipType: RelationshipType;
  relationshipDirection: RelationshipDirection;
  relationshipStrength: RelationshipStrength | null;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  // Relations
  relatedContact?: {
    id: number;
    fullName: string;
    companyName: string | null;
    contactCategory: string;
  };

  static fromEntity(
    relationship: ContactRelationship,
    includeRelations = false,
  ): ContactRelationshipResponseDto {
    const dto = new ContactRelationshipResponseDto();
    dto.id = relationship.id;
    dto.contactId = relationship.contactId;
    dto.relatedContactId = relationship.relatedContactId;
    dto.relationshipType = relationship.relationshipType;
    dto.relationshipDirection = relationship.relationshipDirection;
    dto.relationshipStrength = relationship.relationshipStrength;
    dto.description = relationship.description;
    dto.startDate = relationship.startDate;
    dto.endDate = relationship.endDate;
    dto.isActive = relationship.isActive;
    dto.createdAt = relationship.createdAt;
    dto.updatedAt = relationship.updatedAt;
    dto.createdBy = relationship.createdBy;
    dto.updatedBy = relationship.updatedBy;

    if (includeRelations && relationship.relatedContact) {
      const related = relationship.relatedContact as any;
      dto.relatedContact = {
        id: related.id,
        fullName: related.fullName,
        companyName: related.companyName,
        contactCategory: related.contactCategory,
      };
    }

    return dto;
  }
}

