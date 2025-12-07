import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

/**
 * Clone Leave Policy DTO
 */
export class CloneLeavePolicyDto {
  @IsString()
  policyName: string;

  @IsOptional()
  @IsString()
  policyKey?: string;

  @IsDateString()
  effectiveStartDate: string;

  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;
}
