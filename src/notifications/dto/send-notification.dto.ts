import {
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { NotificationChannel, NotificationPriority } from '../entities';

export class SendNotificationDto {
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsNumber()
  organizationId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  templateKey?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string | null;

  @IsOptional()
  @IsString()
  body?: string | null;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string | null;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  scheduledAt?: Date | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  webhookUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  actionUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  actionLabel?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  relatedEntityType?: string | null;

  @IsOptional()
  @IsNumber()
  relatedEntityId?: number | null;

  @IsOptional()
  templateVariables?: Record<string, any> | null;
}
