import { IsEnum, IsEmail, IsOptional, IsString } from 'class-validator';
import { RequestType, DataSubjectType } from '../entities/data-subject-request.entity';

export class CreateDataSubjectRequestDto {
  @IsEnum(RequestType)
  requestType: RequestType;

  @IsEmail()
  dataSubjectEmail: string;

  @IsOptional()
  @IsString()
  dataSubjectName?: string;

  @IsOptional()
  @IsString()
  dataSubjectIdentifier?: string;

  @IsOptional()
  @IsEnum(DataSubjectType)
  dataSubjectType?: DataSubjectType;

  @IsOptional()
  @IsString()
  description?: string;
}
