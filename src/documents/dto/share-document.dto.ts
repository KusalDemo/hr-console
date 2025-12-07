import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { SharePermission } from '../entities';

export class ShareDocumentDto {
  @IsOptional()
  @IsNumber()
  sharedWithId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sharedWithRole?: string | null;

  @IsArray()
  @IsEnum(SharePermission, { each: true })
  permissions: SharePermission[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  expiresAt?: Date | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sharePassword?: string | null;
}
