import {
  ContactInteraction,
  InteractionType,
  InteractionDirection,
} from '../entities/contact-interaction.entity';

/**
 * Contact Interaction Response DTO
 */
export class ContactInteractionResponseDto {
  id: number;
  contactId: number;
  interactionType: InteractionType;
  direction: InteractionDirection;
  subject: string;
  description: string | null;
  interactionDate: Date;
  duration: number | null;
  employeeId: number | null;
  relatedEntityId: number | null;
  relatedEntityType: string | null;
  outcome: string | null;
  nextAction: string | null;
  nextFollowUpDate: Date | null;
  interactionMetadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  static fromEntity(interaction: ContactInteraction): ContactInteractionResponseDto {
    const dto = new ContactInteractionResponseDto();
    dto.id = interaction.id;
    dto.contactId = interaction.contactId;
    dto.interactionType = interaction.interactionType;
    dto.direction = interaction.direction;
    dto.subject = interaction.subject;
    dto.description = interaction.description;
    dto.interactionDate = interaction.interactionDate;
    dto.duration = interaction.duration;
    dto.employeeId = interaction.employeeId;
    dto.relatedEntityId = interaction.relatedEntityId;
    dto.relatedEntityType = interaction.relatedEntityType;
    dto.outcome = interaction.outcome;
    dto.nextAction = interaction.nextAction;
    dto.nextFollowUpDate = interaction.nextFollowUpDate;
    dto.interactionMetadata = interaction.interactionMetadata;
    dto.createdAt = interaction.createdAt;
    dto.updatedAt = interaction.updatedAt;
    dto.createdBy = interaction.createdBy;
    dto.updatedBy = interaction.updatedBy;

    return dto;
  }
}


