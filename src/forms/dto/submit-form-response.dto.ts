import { IsObject, IsOptional, IsBoolean, IsString } from 'class-validator';

/**
 * Submit Form Response DTO
 */
export class SubmitFormResponseDto {
  @IsObject()
  responseData: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @IsOptional()
  @IsString()
  anonymousIdentifier?: string;
}
