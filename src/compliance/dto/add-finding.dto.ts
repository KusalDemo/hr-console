import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { FindingType, Severity } from '../entities/compliance-audit-finding.entity';

export class AddFindingDto {
  @IsEnum(FindingType)
  findingType: FindingType;

  @IsEnum(Severity)
  severity: Severity;

  @IsString()
  findingTitle: string;

  @IsString()
  findingDescription: string;

  @IsOptional()
  @IsNumber()
  requirementId?: number;

  @IsOptional()
  @IsNumber()
  checklistItemId?: number;
}
