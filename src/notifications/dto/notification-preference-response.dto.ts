import { NotificationPreference } from '../entities';

export class NotificationPreferenceResponseDto {
  id: number;
  userId: number | null;
  organizationId: number | null;
  templateKey: string | null;
  category: string | null;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  webhookEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTimezone: string | null;
  deliveryFrequency: string;
  digestTime: string | null;
  isActive: boolean;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;

  static fromEntity(entity: NotificationPreference): NotificationPreferenceResponseDto {
    const dto = new NotificationPreferenceResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.organizationId = entity.organizationId;
    dto.templateKey = entity.templateKey;
    dto.category = entity.category;
    dto.emailEnabled = entity.emailEnabled;
    dto.smsEnabled = entity.smsEnabled;
    dto.pushEnabled = entity.pushEnabled;
    dto.inAppEnabled = entity.inAppEnabled;
    dto.webhookEnabled = entity.webhookEnabled;
    dto.quietHoursStart = entity.quietHoursStart;
    dto.quietHoursEnd = entity.quietHoursEnd;
    dto.quietHoursTimezone = entity.quietHoursTimezone;
    dto.deliveryFrequency = entity.deliveryFrequency;
    dto.digestTime = entity.digestTime;
    dto.isActive = entity.isActive;
    dto.metadata = entity.metadata;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.createdBy = entity.createdBy;
    dto.updatedBy = entity.updatedBy;
    return dto;
  }
}
