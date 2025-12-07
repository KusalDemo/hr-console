import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MfaType } from '../entities/mfa-configuration.entity';

export class SetupMfaDto {
  @IsEnum(MfaType)
  mfaType: MfaType;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
