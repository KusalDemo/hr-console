import {
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InputType, Field, Int, Float, registerEnumType } from '@nestjs/graphql';
import { JSONScalar } from '../../graphql/scalars/json.scalar';
import { ProjectTeamRole } from '../entities/project-team.entity';

registerEnumType(ProjectTeamRole, { name: 'ProjectTeamRole' });

/**
 * Create Project Team DTO
 */
@InputType()
export class CreateProjectTeamDto {
  @Field(() => Int)
  @IsNumber()
  @Type(() => Number)
  employeeId: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(ProjectTeamRole)
  role?: ProjectTeamRole;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  allocationPercentage?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  hourlyRate?: number;

  // Note: assignmentMetadata uses JSON scalar type
  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  @IsObject()
  assignmentMetadata?: Record<string, any>;
}

