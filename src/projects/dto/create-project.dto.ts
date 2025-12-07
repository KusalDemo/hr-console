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
import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { ProjectStatus, ProjectPriority } from '../entities/project.entity';
import { CreateProjectPhaseDto } from './create-project-phase.dto';
import { CreateProjectTeamDto } from './create-project-team.dto';
import { JSONScalar } from '../../graphql/scalars/json.scalar';

/**
 * Create Project DTO
 */
@InputType()
export class CreateProjectDto {
  @Field(() => String)
  @IsString()
  projectKey: string;

  @Field(() => String)
  @IsString()
  name: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int)
  @IsNumber()
  @Type(() => Number)
  organizationId: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  parentProjectId?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  projectManagerId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  clientId?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  budgetedAmount?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  budgetedHours?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  budgetedRevenue?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  // Note: projectMetadata uses JSON scalar type
  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  @IsObject()
  projectMetadata?: Record<string, any>;

  @Field(() => [CreateProjectPhaseDto], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectPhaseDto)
  phases?: CreateProjectPhaseDto[];

  @Field(() => [CreateProjectTeamDto], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectTeamDto)
  teamMembers?: CreateProjectTeamDto[];
}

