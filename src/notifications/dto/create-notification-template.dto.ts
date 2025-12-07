import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, MaxLength } from 'class-validator';
import { NotificationChannel } from '../entities';

export class CreateNotificationTemplateDto {
  @IsString()
  @MaxLength(128)
  templateKey: string;

  @IsString()
  @MaxLength(255)
  templateName: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  emailSubject?: string | null;

  @IsOptional()
  @IsString()
  emailBody?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  smsBody?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pushTitle?: string | null;

  @IsOptional()
  @IsString()
  pushBody?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  inAppTitle?: string | null;

  @IsOptional()
  @IsString()
  inAppBody?: string | null;

  @IsOptional()
  webhookPayload?: Record<string, any> | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  templateVariables?: string[] | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  defaultPriority?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  metadata?: Record<string, any> | null;
}
