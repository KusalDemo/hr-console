import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { DocumentType, DocumentStatus, StorageProvider } from '../entities';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(255)
  documentName: string;

  @IsEnum(DocumentType)
  documentType: DocumentType;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  documentCategory?: string | null;

  @IsNumber()
  ownerId: number;

  @IsOptional()
  @IsNumber()
  organizationId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  folderPath?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  content?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[] | null;

  @IsOptional()
  customFields?: Record<string, any> | null;

  @IsOptional()
  @IsEnum(DocumentStatus)
  documentStatus?: DocumentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  documentStage?: string | null;

  @IsOptional()
  @IsNumber()
  parentDocumentId?: number | null;

  @IsOptional()
  @IsNumber()
  templateId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  entityType?: string | null;

  @IsOptional()
  @IsNumber()
  entityId?: number | null;

  @IsOptional()
  @IsEnum(StorageProvider)
  storageProvider?: StorageProvider;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  storageLocation?: string | null;

  @IsOptional()
  storageMetadata?: Record<string, any> | null;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  sharingEnabled?: boolean;

  // For LINK type
  @ValidateIf((o) => o.documentType === DocumentType.LINK)
  @IsOptional()
  @IsString()
  @MaxLength(512)
  linkUrl?: string | null;
}
