import { IsEnum, IsEmail, IsOptional, IsString, IsNumber } from 'class-validator';
import { ConsentType, DataSubjectType } from '../entities/consent.entity';

export class RecordConsentDto {
  @IsEmail()
  dataSubjectEmail: string;

  @IsEnum(ConsentType)
  consentType: ConsentType;

  @IsString()
  consentCategory: string;

  @IsOptional()
  @IsString()
  consentPurpose?: string;

  @IsOptional()
  @IsNumber()
  dataSubjectId?: number;

  @IsOptional()
  @IsEnum(DataSubjectType)
  dataSubjectType?: DataSubjectType;

  @IsOptional()
  @IsNumber()
  organizationId?: number;
}


