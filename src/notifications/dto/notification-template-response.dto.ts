import { NotificationTemplate } from '../entities';

export class NotificationTemplateResponseDto {
  id: number;
  templateKey: string;
  templateName: string;
  description: string | null;
  channel: string;
  category: string | null;
  emailSubject: string | null;
  emailBody: string | null;
  smsBody: string | null;
  pushTitle: string | null;
  pushBody: string | null;
  inAppTitle: string | null;
  inAppBody: string | null;
  webhookPayload: Record<string, any> | null;
  templateVariables: string[] | null;
  defaultPriority: string;
  isActive: boolean;
  isSystem: boolean;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  static fromEntity(entity: NotificationTemplate): NotificationTemplateResponseDto {
    const dto = new NotificationTemplateResponseDto();
    dto.id = entity.id;
    dto.templateKey = entity.templateKey;
    dto.templateName = entity.templateName;
    dto.description = entity.description;
    dto.channel = entity.channel;
    dto.category = entity.category;
    dto.emailSubject = entity.emailSubject;
    dto.emailBody = entity.emailBody;
    dto.smsBody = entity.smsBody;
    dto.pushTitle = entity.pushTitle;
    dto.pushBody = entity.pushBody;
    dto.inAppTitle = entity.inAppTitle;
    dto.inAppBody = entity.inAppBody;
    dto.webhookPayload = entity.webhookPayload;
    dto.templateVariables = entity.templateVariables;
    dto.defaultPriority = entity.defaultPriority;
    dto.isActive = entity.isActive;
    dto.isSystem = entity.isSystem;
    dto.metadata = entity.metadata;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.createdBy = entity.createdBy;
    dto.updatedBy = entity.updatedBy;
    return dto;
  }
}
