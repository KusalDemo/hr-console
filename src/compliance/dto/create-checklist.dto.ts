import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ChecklistType } from '../entities/compliance-checklist.entity';

export class CreateChecklistDto {
  @IsNumber()
  frameworkId: number;

  @IsString()
  checklistName: string;

  @IsEnum(ChecklistType)
  checklistType: ChecklistType;

  @IsOptional()
  @IsNumber()
  organizationId?: number;

  @IsOptional()
  @IsNumber()
  assignedToId?: number;
}


