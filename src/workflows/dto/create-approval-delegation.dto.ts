import { IsNumber, IsString, IsOptional, IsBoolean, IsDateString, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Create Approval Delegation DTO
 */
export class CreateApprovalDelegationDto {
  @IsNumber()
  @Type(() => Number)
  delegatorId: number;

  @IsNumber()
  @Type(() => Number)
  delegateId: number;

  @IsOptional()
  @IsString()
  workflowKey?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsDateString()
  effectiveStartDate: string;

  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;

  @IsOptional()
  @IsObject()
  delegationScope?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;

  @IsOptional()
  @IsObject()
  autoDelegationRule?: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;
}
