import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsObject,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus, ProjectPriority } from '../entities/project.entity';
import { CreateProjectPhaseDto } from './create-project-phase.dto';
import { CreateProjectTeamDto } from './create-project-team.dto';

/**
 * Create Project DTO
 */
export class CreateProjectDto {
  @IsString()
  projectKey: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Type(() => Number)
  organizationId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  parentProjectId?: number;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  projectManagerId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  clientId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  budgetedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  budgetedHours?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  budgetedRevenue?: number;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsObject()
  projectMetadata?: Record<string, any>;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectPhaseDto)
  phases?: CreateProjectPhaseDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectTeamDto)
  teamMembers?: CreateProjectTeamDto[];
}

