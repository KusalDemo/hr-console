import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { JSONScalar } from '../../graphql/scalars/json.scalar';
import { ProjectStatus, ProjectPriority, ProjectHealth } from '../entities/project.entity';

/**
 * Update Project DTO
 */
@InputType()
export class UpdateProjectDto {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

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
  @IsEnum(ProjectHealth)
  health?: ProjectHealth;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  actualCompletionDate?: string;

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
  estimatedHours?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  budgetedRevenue?: number;

  // Note: projectMetadata uses JSON scalar type
  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  @IsObject()
  projectMetadata?: Record<string, any>;
}

