import { IsNumber, IsOptional, IsBoolean, IsString, MaxLength, ValidateIf } from 'class-validator';

export class CreateNotificationPreferenceDto {
  @IsOptional()
  @IsNumber()
  userId?: number | null;

  @IsOptional()
  @IsNumber()
  organizationId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  templateKey?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string | null;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  webhookEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  quietHoursStart?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  quietHoursEnd?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  quietHoursTimezone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  deliveryFrequency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  digestTime?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  metadata?: Record<string, any> | null;
}
