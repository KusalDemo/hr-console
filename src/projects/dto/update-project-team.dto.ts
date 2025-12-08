import {
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectTeamRole } from '../entities/project-team.entity';

/**
 * Update Project Team DTO
 */
export class UpdateProjectTeamDto {
  @IsOptional()
  @IsEnum(ProjectTeamRole)
  role?: ProjectTeamRole;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  allocationPercentage?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  assignmentMetadata?: Record<string, any>;
}


